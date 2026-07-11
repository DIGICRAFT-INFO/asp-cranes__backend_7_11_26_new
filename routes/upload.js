const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { protect } = require('../middleware/auth');

// ─── Local Disk Storage ────────────────────────────────────────────────────
// Files are saved to backend_asp/uploads/<images|videos|documents>/ and
// served statically from /uploads (see server.js). No third-party storage
// (e.g. Cloudinary) is used.
//
// IMPORTANT — hosting note: this only persists files if the backend runs on
// a host with a persistent filesystem (a VPS, Railway, Render "web service"
// with a mounted disk, etc). Serverless platforms like Vercel wipe the
// filesystem between deployments/invocations, so uploaded files would
// disappear. If you deploy this backend to Vercel, do NOT use this route as-is
// — either move to a persistent host or reintroduce an object-storage
// provider. See README for details.

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');

const folderFor = (mimetype) => {
  if (mimetype.startsWith('image/')) return 'images';
  if (mimetype.startsWith('video/')) return 'videos';
  return 'documents';
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = folderFor(file.mimetype);
    const dest = path.join(UPLOAD_ROOT, folder);
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${unique}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|svg|mp4|webm|mov|pdf|doc|docx/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype) || file.mimetype === 'application/pdf' ||
    file.mimetype === 'application/msword' ||
    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (ext && mime) cb(null, true);
  else cb(new Error('Invalid file type. Allowed: images, videos, PDFs, Word docs.'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 },
});

// Builds an absolute URL for a saved file so the frontend can use it directly
// regardless of which domain/port the API is running behind.
const toPublicUrl = (req, folder, filename) => {
  const base = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
  return `${base}/uploads/${folder}/${filename}`;
};

const describeFile = (req, file) => {
  const folder = folderFor(file.mimetype);
  let type = 'document';
  if (folder === 'images') type = 'image';
  if (folder === 'videos') type = 'video';
  return {
    filename: file.filename,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    type,
    folder,
    url: toPublicUrl(req, folder, file.filename),
  };
};

// POST /api/upload/single
router.post('/single', protect, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    res.json({ success: true, message: 'File uploaded successfully', data: describeFile(req, req.file) });
  } catch (err) {
    next(err);
  }
});

// POST /api/upload/multiple
router.post('/multiple', protect, upload.array('files', 20), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }
    const uploads = req.files.map((f) => describeFile(req, f));
    res.json({ success: true, message: 'Files uploaded successfully', data: uploads });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/upload?url=<fullOrRelativeUrl>
// Removes a previously uploaded file from disk. The admin CMS calls this
// whenever a user deletes an image/video/PDF attached to a crane, service,
// project, or blog post, so orphaned files don't pile up on the server.
router.delete('/', protect, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ success: false, message: 'url query param is required' });

    // Accept either a full URL or a path like /uploads/images/xyz.jpg
    let relativePath;
    try {
      relativePath = new URL(url).pathname;
    } catch {
      relativePath = url;
    }

    if (!relativePath.startsWith('/uploads/')) {
      return res.status(400).json({ success: false, message: 'Only files under /uploads can be deleted' });
    }

    const filePath = path.join(UPLOAD_ROOT, relativePath.replace('/uploads/', ''));

    // Guard against path traversal outside the uploads folder.
    if (!filePath.startsWith(UPLOAD_ROOT)) {
      return res.status(400).json({ success: false, message: 'Invalid file path' });
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ success: true, message: 'File deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
