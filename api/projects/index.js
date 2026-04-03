// GET    /api/projects          — list all project cards (public: hides hidden ones)
// GET    /api/projects?slug=X   — get single project with full content
// POST   /api/projects          — create project (admin)
// PATCH  /api/projects          — update project (admin), body: { slug, ...fields }
// DELETE /api/projects          — delete project (admin), body: { slug }

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

function slugify(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
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
    // Public: filter hidden. Admin: show all, mark hidden.
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

  // ── POST (create) ───────────────────────────────────────────────
  if (req.method === 'POST') {
    const {
      title, summary, tags = [], year, role, company, period,
      location, coverImage, content = [], order, externalUrl
    } = req.body || {};
    if (!title) { return res.status(400).json({ error: 'title required' }); }

    const slug = slugify(title);
    const existing = await kv.get(`project:${slug}`);
    if (existing) { return res.status(409).json({ error: 'slug already exists', slug }); }

    const project = {
      slug, title, summary: summary || '', tags,
      year:      year      || new Date().getFullYear(),
      role:      role      || '',
      company:   company   || '',
      period:    period    || '',
      location:  location  || '',
      coverImage: coverImage || null,
      content,          // array of content blocks
      order:     order   || 99,
      externalUrl: externalUrl || null,
      isHidden:  false,
      isStatic:  false, // dynamic (KV-backed) project
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`project:${slug}`, project);

    // Append to slug list
    const slugs = (await kv.get('project:list')) || [];
    if (!slugs.includes(slug)) {
      await kv.set('project:list', [...slugs, slug]);
    }

    return res.status(201).json(project);
  }

  // ── PATCH (update) ──────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const { slug, ...updates } = req.body || {};
    if (!slug) { return res.status(400).json({ error: 'slug required' }); }
    const existing = await kv.get(`project:${slug}`);
    if (!existing) { return res.status(404).json({ error: 'not found' }); }
    const updated = { ...existing, ...updates, slug, updatedAt: new Date().toISOString() };
    await kv.set(`project:${slug}`, updated);
    return res.status(200).json(updated);
  }

  // ── DELETE ──────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { slug } = req.body || {};
    if (!slug) { return res.status(400).json({ error: 'slug required' }); }
    await kv.del(`project:${slug}`);
    const slugs = (await kv.get('project:list')) || [];
    await kv.set('project:list', slugs.filter(s => s !== slug));
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
