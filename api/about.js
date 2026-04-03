// GET  /api/about  — public, returns about page content overrides
// PATCH /api/about — admin only, saves field overrides to KV

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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { return res.status(200).end(); }

  // GET — return stored field overrides (or empty object if none)
  if (req.method === 'GET') {
    const fields = (await kv.get('about:fields')) || {};
    return res.status(200).json(fields);
  }

  // PATCH — admin save field overrides
  if (req.method === 'PATCH') {
    if (!isAdmin(req)) { return res.status(401).json({ error: 'Unauthorized' }); }

    const incoming = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!incoming || typeof incoming !== 'object') {
      return res.status(400).json({ error: 'Invalid body' });
    }

    // Merge with existing overrides
    const existing = (await kv.get('about:fields')) || {};
    const merged   = { ...existing, ...incoming, updatedAt: new Date().toISOString() };
    await kv.set('about:fields', merged);

    return res.status(200).json({ ok: true, fields: merged });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
