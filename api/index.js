// Vercel serverless entry point.
// Vercel auto-detects any file under /api as a function; exporting the
// Express app directly lets Vercel's Node runtime handle it as (req, res).
module.exports = require('../server.js');
