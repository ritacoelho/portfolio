// GET  /api/likes?slug=<slug>    — get like count for a project
// POST /api/likes                — add a like (once per session, tracked by fingerprint)
// Body: { slug: string, sessionId: string }

const { Redis } = require('@upstash/redis');
const kv = new Redis({
  url:   process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

module.exports = async function handler(req, res) {
  // ── GET count ────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { slug } = req.query;
    if (!slug) return res.status(400).json({ error: 'slug required' });
    const count = (await kv.get(`likes:${slug}`)) || 0;
    return res.status(200).json({ slug, count });
  }

  // ── POST (add like) ──────────────────────────────────────────
  if (req.method === 'POST') {
    const { slug, sessionId } = req.body || {};
    if (!slug || !sessionId) {
      return res.status(400).json({ error: 'slug and sessionId required' });
    }

    // One like per session per project
    const sessionKey = `like_session:${slug}:${sessionId}`;
    const alreadyLiked = await kv.get(sessionKey);
    if (alreadyLiked) {
      const count = (await kv.get(`likes:${slug}`)) || 0;
      return res.status(200).json({ slug, count, alreadyLiked: true });
    }

    // Mark session as having liked this project (expires in 30 days)
    await kv.set(sessionKey, 1, { ex: 60 * 60 * 24 * 30 }); // 30-day TTL

    // Increment count
    const newCount = await kv.incr(`likes:${slug}`);
    return res.status(200).json({ slug, count: newCount, alreadyLiked: false });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
