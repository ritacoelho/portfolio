// POST /api/upload
// Multipart upload → Vercel Blob. Admin only.
// Returns: { url: string }

const { put }  = require('@vercel/blob');
const jwt      = require('jsonwebtoken');

function requireAdmin(req) {
  const auth  = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  try {
    jwt.verify(token, process.env.ADMIN_SESSION_SECRET);
    return true;
  } catch { return false; }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Vercel passes raw body as Buffer for multipart — use filename from query
  const filename = req.query.filename;
  if (!filename) {
    return res.status(400).json({ error: 'filename query param required' });
  }

  try {
    const blob = await put(filename, req, {
      access: 'public',
      token:  process.env.BLOB_READ_WRITE_TOKEN,
    });
    return res.status(200).json({ url: blob.url });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: 'Upload failed', detail: err.message });
  }
};
