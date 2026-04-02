// GET /api/admin/verify
// Authorization: Bearer <token>
// Returns 200 if token is valid, 401 otherwise

const jwt = require('jsonwebtoken');

module.exports = function handler(req, res) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }

  try {
    jwt.verify(token, process.env.ADMIN_SESSION_SECRET);
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
