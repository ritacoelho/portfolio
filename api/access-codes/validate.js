// POST /api/access-codes/validate
// Body: { code: string }
// Returns: { valid: true } | { error: 'invalid' | 'expired' | 'inactive' }

const { Redis } = require('@upstash/redis');
const kv = new Redis({
  url:   process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.body || {};
  if (!code) {
    return res.status(400).json({ error: 'invalid' });
  }

  // Look up code entry
  const entry = await kv.get(`access_code:${code.trim().toUpperCase()}`);

  if (!entry) {
    return res.status(403).json({ error: 'invalid' });
  }

  if (!entry.isActive) {
    return res.status(403).json({ error: 'inactive' });
  }

  if (entry.expiryDate && new Date(entry.expiryDate) < new Date()) {
    return res.status(403).json({ error: 'expired' });
  }

  // Increment usage count
  await kv.set(`access_code:${code.trim().toUpperCase()}`, {
    ...entry,
    usageCount: (entry.usageCount || 0) + 1,
    lastUsedAt: new Date().toISOString()
  });

  return res.status(200).json({ valid: true, recipient: entry.recipient });
};
