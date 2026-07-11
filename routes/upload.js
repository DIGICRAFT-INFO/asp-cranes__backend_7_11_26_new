const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { protect } = require('../middleware/auth');

// ─── Environment Detection ─────────────────────────────────────────────────
// On Vercel: filesystem is read-only (/var/task). Use memoryStorage + base64
// data URLs so files work without any disk write.
// On local/VPS: use diskStorage to save files to public/uploads/.
const IS_SERVERLESS = !!process.env.VERCEL;

// ─── File Filter ───────────────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  const allowedExt = /\.(jpeg|jpg|png|gif|webp|svg|mp4|webm|mov|pdf|doc|docx)$/i;
  const allowedMime = /^(image\/|video\/)/.test(file.mimetype) ||
    ['application/pdf', 'application/msword',
     'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.mimetype);
  if (allowedExt.test(path.extname(file.originalname)) && allowedMime) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed: images, videos, PDFs, Word docs.'));
  }
};

const MAX_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024;

// ─── Storage Strategy ──────────────────────────────────────────────────────
let storage;
let UPLOAD_ROOT;

if (IS_SERVERLESS) {
  // Vercel: use memory storage, return base64 data URL
  storage = multer.memoryStorage();
} else {
  // Local / VPS: save to disk
  UPLOAD_ROOT = path.join(__dirname, '..', 'public', 'uploads');
  storage = multer.diskStorage({
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
}

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE } });

// ─── Helpers ──────────────────────────────────────────────────────────────
function folderFor(mimetype) {
  if (mimetype.startsWith('image/')) return 'images';
  if (mimetype.startsWith('video/')) return 'videos';
  return 'documents';
}

function typeFor(folder) {
  if (folder === 'images') return 'image';
  if (folder === 'videos') return 'video';
  return 'document';
}

function describeFile(req, file) {
  const folder = folderFor(file.mimetype);
  const type = typeFor(folder);
  let url;

  if (IS_SERVERLESS) {
    // Return base64 data URL — no filesystem needed
    const b64 = file.buffer.toString('base64');
    url = `data:${file.mimetype};base64,${b64}`;
  } else {
    const base = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    url = `${base}/uploads/${folder}/${file.filename}`;
  }

  return {
    filename: IS_SERVERLESS ? `${Date.now()}-${file.originalname}` : file.filename,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    type,
    folder,
    url,
  };
}

// ─── POST /api/upload/single ──────────────────────────────────────────────
router.post('/single', protect, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded. Check Content-Type is multipart/form-data.' });
    res.json({ success: true, message: 'File uploaded successfully', data: describeFile(req, req.file) });
  } catch (err) { next(err); }
});

// ─── POST /api/upload/multiple ────────────────────────────────────────────
router.post('/multiple', protect, upload.array('files', 20), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded. Check Content-Type is multipart/form-data.' });
    }
    res.json({ success: true, message: 'Files uploaded', data: req.files.map(f => describeFile(req, f)) });
  } catch (err) { next(err); }
});

// ─── GET /api/upload/file/:folder/:filename — Serve local files ────────────
router.get('/file/:folder/:filename', (req, res) => {
  if (IS_SERVERLESS) return res.status(404).json({ success: false, message: 'File serving not available on serverless' });
  const { folder, filename } = req.params;
  if (!/^(images|videos|documents)$/.test(folder) || filename.includes('..')) {
    return res.status(400).json({ success: false, message: 'Invalid path' });
  }
  const filePath = path.join(UPLOAD_ROOT, folder, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: 'File not found' });
  res.sendFile(filePath);
});

// ─── DELETE /api/upload?url=<url> ─────────────────────────────────────────
router.delete('/', protect, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ success: false, message: 'url query param required' });

    // On Vercel, files are base64 data URLs — nothing to delete from disk
    if (IS_SERVERLESS || url.startsWith('data:')) {
      return res.json({ success: true, message: 'File removed' });
    }

    // Local: parse folder/filename and delete from disk
    const match = url.match(/\/uploads\/(images|videos|documents)\/([^/?]+)/) ||
                  url.match(/\/api\/upload\/file\/(images|videos|documents)\/([^/?]+)/);
    if (!match) return res.status(400).json({ success: false, message: 'Cannot parse file path from URL' });

    const [, folder, filename] = match;
    if (!/^(images|videos|documents)$/.test(folder) || filename.includes('..')) {
      return res.status(400).json({ success: false, message: 'Invalid path' });
    }

    const filePath = path.join(UPLOAD_ROOT, folder, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({ success: true, message: 'File deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
