const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { protect } = require('../middleware/auth');

// ─── Storage Root ──────────────────────────────────────────────────────────
// On Vercel (serverless), /var/task is read-only.
// We write to /tmp (writable but ephemeral) and serve via a /tmp-file proxy.
// On a persistent host (VPS/Railway/Render), we write to ./public/uploads
// and serve statically.

const IS_VERCEL = !!process.env.VERCEL || process.env.NODE_ENV === 'production';
const UPLOAD_ROOT = IS_VERCEL
  ? '/tmp/uploads'
  : path.join(__dirname, '..', 'public', 'uploads');

const folderFor = (mimetype) => {
  if (mimetype.startsWith('image/')) return 'images';
  if (mimetype.startsWith('video/')) return 'videos';
  return 'documents';
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = folderFor(file.mimetype);
    const dest = path.join(UPLOAD_ROOT, folder);
    try { fs.mkdirSync(dest, { recursive: true }); } catch (e) {}
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${unique}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExt = /\.(jpeg|jpg|png|gif|webp|svg|mp4|webm|mov|pdf|doc|docx)$/i;
  const ext = allowedExt.test(path.extname(file.originalname));
  const allowedMime = /^(image\/|video\/)/.test(file.mimetype) ||
    ['application/pdf', 'application/msword',
     'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.mimetype);
  if (ext && allowedMime) cb(null, true);
  else cb(new Error('Invalid file type. Allowed: images, videos, PDFs, Word docs.'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 },
});

// ─── URL Builder ────────────────────────────────────────────────────────────
const toPublicUrl = (req, folder, filename) => {
  const base = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
  if (IS_VERCEL) {
    // On Vercel: serve via /api/upload/file proxy
    return `${base}/api/upload/file/${folder}/${filename}`;
  }
  return `${base}/uploads/${folder}/${filename}`;
};

const describeFile = (req, file) => {
  const folder = folderFor(file.mimetype);
  const type = folder === 'images' ? 'image' : folder === 'videos' ? 'video' : 'document';
  return {
    filename: file.filename,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    type, folder,
    url: toPublicUrl(req, folder, file.filename),
  };
};

// ─── POST /api/upload/single ─────────────────────────────────────────────
router.post('/single', protect, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    res.json({ success: true, message: 'File uploaded successfully', data: describeFile(req, req.file) });
  } catch (err) { next(err); }
});

// ─── POST /api/upload/multiple ───────────────────────────────────────────
router.post('/multiple', protect, upload.array('files', 20), async (req, res, next) => {
  try {
    if (!req.files?.length) return res.status(400).json({ success: false, message: 'No files uploaded' });
    res.json({ success: true, message: 'Files uploaded', data: req.files.map(f => describeFile(req, f)) });
  } catch (err) { next(err); }
});

// ─── GET /api/upload/file/:folder/:filename — Serve from /tmp on Vercel ──
router.get('/file/:folder/:filename', (req, res) => {
  const { folder, filename } = req.params;
  // Security: only allow safe folder names
  if (!/^(images|videos|documents)$/.test(folder)) {
    return res.status(400).json({ success: false, message: 'Invalid folder' });
  }
  // Prevent path traversal
  if (filename.includes('..') || filename.includes('/')) {
    return res.status(400).json({ success: false, message: 'Invalid filename' });
  }
  const filePath = path.join(UPLOAD_ROOT, folder, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'File not found' });
  }
  res.sendFile(filePath);
});

// ─── DELETE /api/upload?url=<url> ────────────────────────────────────────
router.delete('/', protect, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ success: false, message: 'url query param required' });

    // Extract folder/filename from URL
    // Handles both /uploads/images/file.jpg and /api/upload/file/images/file.jpg
    let folder, filename;
    const uploadMatch = url.match(/\/uploads\/(images|videos|documents)\/([^/?]+)/);
    const proxyMatch = url.match(/\/api\/upload\/file\/(images|videos|documents)\/([^/?]+)/);
    const match = uploadMatch || proxyMatch;

    if (!match) return res.status(400).json({ success: false, message: 'Cannot parse file path from URL' });
    folder = match[1];
    filename = match[2];

    // Security checks
    if (!/^(images|videos|documents)$/.test(folder)) {
      return res.status(400).json({ success: false, message: 'Invalid folder' });
    }
    if (filename.includes('..')) {
      return res.status(400).json({ success: false, message: 'Invalid filename' });
    }

    const filePath = path.join(UPLOAD_ROOT, folder, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({ success: true, message: 'File deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
