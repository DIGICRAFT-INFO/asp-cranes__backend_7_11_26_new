// ─── Load ENV FIRST ───────────────────────────────────────────────────────────
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');

const app = express();

// ─── JWT Secret Strength Validation ──────────────────────────────────────────
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('🔐 [FATAL SECURITY WARNING] JWT_SECRET is missing or shorter than 32 characters!');
  console.error('🔐 Run: openssl rand -hex 32  and set the result as JWT_SECRET in your .env file');
}
if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
  console.error('🔐 [FATAL SECURITY WARNING] JWT_REFRESH_SECRET is missing or shorter than 32 characters!');
  console.error('🔐 Run: openssl rand -hex 32  and set the result as JWT_REFRESH_SECRET in your .env file');
}

// ─── Helmet Security Headers ──────────────────────────────────────────────────
app.use(helmet());
// HSTS: only in production (Vercel handles TLS termination)
if (process.env.NODE_ENV === 'production') {
  app.use(helmet.hsts({
    maxAge: 31536000,
    includeSubDomains: true,
  }));
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' }
});

// ─── Middleware ───────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
  process.env.HOSTINGER_URL,
  'https://asp-cranes-frontend.vercel.app',
  // Dev origins only included in non-production environments
  ...(process.env.NODE_ENV !== 'production'
    ? [
        // Extra origins via env (comma-separated)
        ...(process.env.DEV_ORIGINS ? process.env.DEV_ORIGINS.split(',').map(o => o.trim()) : []),
        // Common local dev ports
        'http://localhost:3000',
        'http://localhost:3100',
      ]
    : []),
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
// NOTE: Do NOT apply express.json/urlencoded to /api/upload routes —
// multer handles multipart/form-data parsing itself, and applying body-parser
// before multer on upload routes will consume the stream and return empty files.

// ─── NoSQL Injection Sanitization ────────────────────────────────────────────
// Strips keys beginning with '$' and containing '.' from req.body, req.query, req.params
app.use(mongoSanitize());

// Static folder for uploaded images/videos/documents (see routes/upload.js).
// NOTE: this requires a persistent filesystem. It works on a VPS or any
// "always-on" Node host. It will NOT persist on serverless platforms like
// Vercel, since their filesystem is read-only/ephemeral outside of /tmp.
// Static file serving for local dev (persistent filesystem).
// On Vercel, files are served via GET /api/upload/file/:folder/:filename proxy.
const IS_VERCEL = !!process.env.VERCEL || process.env.NODE_ENV === 'production';
if (!IS_VERCEL) {
  app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
}

// ─── MongoDB Connection (cached across serverless invocations) ───────────────
let isConnected = false;

const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) return;

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing in environment variables');
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      bufferCommands: false,
    });
    isConnected = true;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    isConnected = false;
    console.error('❌ DB Error:', err.message);
    throw err;
  }
};

// ─── Health Check ─────────────────────────────────────────────────────────────
// Pre-load models to avoid first-request latency
require('./models/User');
require('./models/Crane');
require('./models/Blog');
require('./models/Homepage');
require('./models/Notification');
require('./models/index');

// Registered BEFORE the DB gate below so it always responds, even if Mongo
// is unreachable — otherwise this endpoint would be useless for monitoring.
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'online',
    db_status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    time: new Date()
  });
});

// Ensure a DB connection exists before any other /api request is handled.
// Required because serverless functions can cold-start with no connection.
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(503).json({ success: false, message: 'Database connection failed', error: err.message });
  }
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api', limiter);

app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/homepage', require('./routes/homepage'));
app.use('/api/cranes', require('./routes/cranes'));
app.use('/api/services', require('./routes/services'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/blogs', require('./routes/blogs'));
app.use('/api/about', require('./routes/about'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/faqs', require('./routes/faqs'));
app.use('/api/careers', require('./routes/careers'));
app.use('/api/career-applications', require('./routes/career-applications'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/settings', require('./routes/settings'));

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  console.error(`🔥 [${new Date().toISOString()}] Error:`, err.stack || err.message);

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ─── Local Dev Server ─────────────────────────────────────────────────────────
// Vercel imports `app` directly via api/index.js and never calls listen().
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  connectDB().catch(() => {}); // don't hard-exit locally; the /api middleware retries per-request
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`🔗 URL → http://localhost:${PORT}`);
  });

  process.on('unhandledRejection', (err) => {
    console.log('❌ Unhandled Rejection:', err.message);
    server.close(() => process.exit(1));
  });
}

module.exports = app;
