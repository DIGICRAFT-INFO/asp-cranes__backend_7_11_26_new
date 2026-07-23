const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ─── Verify Token ─────────────────────────────────────────────────────────────
exports.protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized. No token provided.' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password -refreshToken');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Account no longer exists.',
        code: 'ACCOUNT_DELETED'
      });
    }
    // Real-time revoke: if account deactivated, immediately reject
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account deactivated.',
        code: 'ACCOUNT_REVOKED'
      });
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

// ─── Role Authorization ────────────────────────────────────────────────────────
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized for this action.`
      });
    }
    next();
  };
};

// ─── Page Access Authorization (RBAC) ─────────────────────────────────────────
// Checks if the admin user has access to a specific page
exports.checkPageAccess = (page) => {
  return (req, res, next) => {
    // superadmin always has full access
    if (req.user.role === 'superadmin') return next();

    const allowed = req.user.allowedPages || [];
    if (!allowed.includes(page)) {
      return res.status(403).json({
        success: false,
        message: `You don't have access to '${page}'.`,
        code: 'PAGE_ACCESS_DENIED'
      });
    }
    next();
  };
};
