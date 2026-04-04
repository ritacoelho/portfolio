// POST /api/upload
// Converts uploaded image to a base64 data URL — no external storage needed.
// Client: fetch('/api/upload?filename=foo.jpg', { method:'POST', body: fileObject })
// Returns: { url: string }  (data URL stored directly in project JSON)

const jwt = require('jsonwebtoken');

const MAX_SIZE = 4 * 1024 * 1024; // 4 MB limit

function requireAdmin(req) {
  const auth  = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  try {
    jwt.verify(token, process.env.ADMIN_SESSION_SECRET);
    return true;
  } catch { return false; }
}

// Read the full request body as a Buffer
async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

// Derive MIME type from filename extension
function mimeFromFilename(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  const map = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
                gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
                avif: 'image/avif' };
  return map[ext] || 'image/jpeg';
}

module.exports = async function handler(req, res) {
  // CORS preflight
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

  const filename = req.query.filename || 'image.jpg';

  try {
    const buffer = await readBody(req);

    if (buffer.length > MAX_SIZE) {
      return res.status(413).json({ error: 'Image too large. Please use an image under 4 MB.' });
    }

    const contentType = req.headers['content-type'] || mimeFromFilename(filename);
    const base64      = buffer.toString('base64');
    const dataUrl     = `data:${contentType};base64,${base64}`;

    return res.status(200).json({ url: dataUrl });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: 'Upload failed', detail: err.message });
  }
};
