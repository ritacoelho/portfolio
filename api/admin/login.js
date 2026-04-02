// POST /api/admin/login
// Body: { password: string }
// Returns: { token: string } or 401

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body || {};
  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }

  const hash   = process.env.ADMIN_PASSWORD_HASH;
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!hash || !secret) {
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  const valid = await bcrypt.compare(password, hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const token = jwt.sign({ admin: true }, secret, { expiresIn: '12h' });
  return res.status(200).json({ token });
};
