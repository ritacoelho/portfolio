// GET    /api/projects          — list all project cards (public: hides hidden ones)
// GET    /api/projects?slug=X   — get single project with full content
// PATCH  /api/projects          — update visibility / lock status (admin only)
//                                 body: { slug, isHidden?, isLocked? }
//
// POST and DELETE are intentionally removed.
// Projects are static HTML files; add new ones by editing the codebase directly.

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

module.exports = async function handler(req, res) {
  const admin = isAdmin(req);

  // ── GET single project ──────────────────────────────────────────
  if (req.method === 'GET' && req.query.slug) {
    const slug    = req.query.slug;
    const project = await kv.get(`project:${slug}`);
    if (!project) { return res.status(404).json({ error: 'not found' }); }
    if (!admin && project.isHidden) {
      return res.status(404).json({ error: 'not found' });
    }
    return res.status(200).json(project);
  }

  // ── GET list ────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const slugs = (await kv.get('project:list')) || [];
    const items = await Promise.all(
      slugs.map(s => kv.get(`project:${s}`))
    );
    const valid = items.filter(Boolean);
    // Public: filter hidden. Admin: show all (hidden cards get rc-hidden-card class on frontend).
    const result = admin ? valid : valid.filter(p => !p.isHidden);
    // Sort by order asc, then year desc
    result.sort((a, b) => {
      if (a.order !== b.order) return (a.order || 99) - (b.order || 99);
      return (b.year || 0) - (a.year || 0);
    });
    return res.status(200).json(result);
  }

  // ── Admin-only mutations ────────────────────────────────────────
  if (!admin) { return res.status(401).json({ error: 'Unauthorized' }); }

  // ── PATCH — visibility and lock status only ─────────────────────
  if (req.method === 'PATCH') {
    const { slug, isHidden, isLocked } = req.body || {};
    if (!slug) { return res.status(400).json({ error: 'slug required' }); }

    const existing = await kv.get(`project:${slug}`);
    if (!existing) { return res.status(404).json({ error: 'not found' }); }

    const updated = { ...existing, updatedAt: new Date().toISOString() };
    if (isHidden !== undefined) { updated.isHidden = Boolean(isHidden); }
    if (isLocked !== undefined) { updated.isLocked = Boolean(isLocked); }

    await kv.set(`project:${slug}`, updated);
    return res.status(200).json(updated);
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
