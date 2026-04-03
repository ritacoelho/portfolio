// GET  /api/access-codes       — list all codes (admin only)
// POST /api/access-codes       — create new code (admin only)
// DELETE /api/access-codes     — delete a code (admin only)
// PATCH /api/access-codes      — update a code (admin only)

const { Redis } = require('@upstash/redis');
const kv = new Redis({
  url:   process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});
const jwt = require('jsonwebtoken');

function requireAdmin(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  try {
    jwt.verify(token, process.env.ADMIN_SESSION_SECRET);
    return true;
  } catch {
    return false;
  }
}

function randomCode(len = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I,O,0,1 (confusable)
  let out = '';
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

module.exports = async function handler(req, res) {
  if (!requireAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // ── LIST ──────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const keys = await kv.keys('access_code:*');
    const entries = await Promise.all(
      keys.map(async (k) => ({ code: k.replace('access_code:', ''), ...(await kv.get(k)) }))
    );
    entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.status(200).json(entries);
  }

  // ── CREATE ────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { recipient, description, expiryDate } = req.body || {};
    if (!recipient) {
      return res.status(400).json({ error: 'recipient required' });
    }
    const code = randomCode();
    const entry = {
      recipient,
      description: description || '',
      expiryDate:  expiryDate  || null,
      isActive:    true,
      usageCount:  0,
      lastUsedAt:  null,
      createdAt:   new Date().toISOString()
    };
    await kv.set(`access_code:${code}`, entry);
    return res.status(201).json({ code, ...entry });
  }

  // ── PATCH (update description / deactivate) ───────────────────
  if (req.method === 'PATCH') {
    const { code, description, isActive, expiryDate } = req.body || {};
    if (!code) return res.status(400).json({ error: 'code required' });
    const existing = await kv.get(`access_code:${code}`);
    if (!existing) return res.status(404).json({ error: 'not found' });
    const updated = {
      ...existing,
      description: description !== undefined ? description : existing.description,
      isActive:    isActive    !== undefined ? isActive    : existing.isActive,
      expiryDate:  expiryDate  !== undefined ? expiryDate  : existing.expiryDate
    };
    await kv.set(`access_code:${code}`, updated);
    return res.status(200).json({ code, ...updated });
  }

  // ── DELETE ────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ error: 'code required' });
    await kv.del(`access_code:${code}`);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
