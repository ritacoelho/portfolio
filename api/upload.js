// POST /api/upload
// Raw binary upload → Vercel Blob. Admin only.
// Client: fetch('/api/upload?filename=foo.jpg', { method:'POST', body: fileObject })
// Returns: { url: string }

const { put } = require('@vercel/blob');
const jwt     = require('jsonwebtoken');

function requireAdmin(req) {
  const auth  = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  try {
    jwt.verify(token, process.env.ADMIN_SESSION_SECRET);
    return true;
  } catch { return false; }
}

// Read the full request body as a Buffer (required for binary data)
async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

module.exports = async function handler(req, res) {
  // Allow preflight
  res.setHeader('Access-Control-Allow-Origin',  req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') { return res.status(204).end(); }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({ error: 'BLOB_READ_WRITE_TOKEN not configured in Vercel environment variables.' });
  }

  const filename = req.query.filename;
  if (!filename) {
    return res.status(400).json({ error: 'filename query param required' });
  }

  try {
    // Read the raw binary body into a Buffer before passing to Vercel Blob
    const buffer = await readBody(req);
    const contentType = req.headers['content-type'] || 'application/octet-stream';

    const blob = await put(filename, buffer, {
      access:      'public',
      token:       process.env.BLOB_READ_WRITE_TOKEN,
      contentType: contentType,
    });
    return res.status(200).json({ url: blob.url });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: 'Upload failed', detail: err.message });
  }
};
