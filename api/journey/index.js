// GET    /api/journey          — list all entries (public: hides hidden ones)
// GET    /api/journey?id=X     — get single entry
// POST   /api/journey          — create entry (admin)
// PATCH  /api/journey          — update entry (admin), body: { id, ...fields }
// DELETE /api/journey          — delete entry (admin), body: { id }

const { Redis } = require('@upstash/redis');
const jwt       = require('jsonwebtoken');

const kv = new Redis({
  url:   process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

function isAdmin(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try { jwt.verify(token, process.env.ADMIN_SESSION_SECRET); return true; }
  catch { return false; }
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

module.exports = async function handler(req, res) {
  const admin = isAdmin(req);

  // ── GET single entry ────────────────────────────────────────────
  if (req.method === 'GET' && req.query.id) {
    const entry = await kv.get(`journey:${req.query.id}`);
    if (!entry) { return res.status(404).json({ error: 'not found' }); }
    if (!admin && entry.isHidden) { return res.status(404).json({ error: 'not found' }); }
    return res.status(200).json(entry);
  }

  // ── GET list ────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const ids   = (await kv.get('journey:list')) || [];
    const items = await Promise.all(ids.map(id => kv.get(`journey:${id}`)));
    const valid = items.filter(Boolean);
    const result = admin ? valid : valid.filter(e => !e.isHidden);
    // Sort newest-first by startYear/startMonth descending
    result.sort((a, b) => {
      const ay = (a.endYear || a.startYear || 0) * 12 + (a.endMonth || a.startMonth || 0);
      const by = (b.endYear || b.startYear || 0) * 12 + (b.endMonth || b.startMonth || 0);
      return by - ay;
    });
    return res.status(200).json(result);
  }

  // ── Admin-only mutations ────────────────────────────────────────
  if (!admin) { return res.status(401).json({ error: 'Unauthorized' }); }

  // ── POST (create) ───────────────────────────────────────────────
  if (req.method === 'POST') {
    const {
      role, org, type = 'work', location,
      startYear, startMonth, endYear, endMonth, isCurrent,
      description, bullets = []
    } = req.body || {};
    if (!role || !org) { return res.status(400).json({ error: 'role and org required' }); }

    const id    = makeId();
    const entry = {
      id, role, org, type, location: location || '',
      startYear:  startYear  || null,
      startMonth: startMonth || null,
      endYear:    endYear    || null,
      endMonth:   endMonth   || null,
      isCurrent:  isCurrent  || false,
      description: description || '',
      bullets,
      isHidden:  false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`journey:${id}`, entry);
    const ids = (await kv.get('journey:list')) || [];
    await kv.set('journey:list', [...ids, id]);
    return res.status(201).json(entry);
  }

  // ── PATCH (update) ──────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const { id, ...updates } = req.body || {};
    if (!id) { return res.status(400).json({ error: 'id required' }); }
    const existing = await kv.get(`journey:${id}`);
    if (!existing) { return res.status(404).json({ error: 'not found' }); }
    const updated = { ...existing, ...updates, id, updatedAt: new Date().toISOString() };
    await kv.set(`journey:${id}`, updated);
    return res.status(200).json(updated);
  }

  // ── DELETE ──────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) { return res.status(400).json({ error: 'id required' }); }
    await kv.del(`journey:${id}`);
    const ids = (await kv.get('journey:list')) || [];
    await kv.set('journey:list', ids.filter(i => i !== id));
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
