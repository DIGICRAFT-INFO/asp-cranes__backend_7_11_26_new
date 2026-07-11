const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');

const ALL_PAGES = [
  'homepage', 'about', 'cranes', 'services', 'projects',
  'blogs', 'careers', 'categories', 'clients', 'faqs', 'contacts', 'settings'
];

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '15m' });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' });
  return { accessToken, refreshToken };
};

// ─── Helper: create notification ──────────────────────────────────────────────
const createNotification = async ({ recipient, actor, type, title, message, meta }) => {
  try {
    await Notification.create({ recipient, actor, type, title, message, meta });
  } catch (e) {
    console.error('Notification creation failed:', e.message);
  }
};

// ─── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password +refreshToken');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account access has been revoked. Please contact the administrator.',
        code: 'ACCOUNT_REVOKED'
      });
    }
    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          allowedPages: user.role === 'superadmin' ? ALL_PAGES : (user.allowedPages || []),
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// ─── POST /api/auth/refresh ────────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token required.' });
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
    }
    // Check if account was revoked
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account access revoked.',
        code: 'ACCOUNT_REVOKED'
      });
    }
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);
    user.refreshToken = newRefreshToken;
    await user.save();
    res.json({ success: true, data: { accessToken, refreshToken: newRefreshToken } });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
  }
});

// ─── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post('/logout', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  const user = req.user.toObject ? req.user.toObject() : req.user;
  if (user.role === 'superadmin') user.allowedPages = ALL_PAGES;
  res.json({ success: true, data: user });
});

// ─── PUT /api/auth/profile — Update own profile (name, email, avatar) ─────────
router.put('/profile', protect, [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().normalizeEmail(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  try {
    const { name, email, avatar } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (avatar !== undefined) updates.avatar = avatar;

    // If email is being changed, check uniqueness
    if (email && email !== req.user.email) {
      const exists = await User.findOne({ email, _id: { $ne: req.user._id } });
      if (exists) return res.status(400).json({ success: false, message: 'Email already in use.' });
      updates.email = email;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ success: true, message: 'Profile updated.', data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// ─── PUT /api/auth/change-password ────────────────────────────────────────────
router.put('/change-password', protect, [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 chars'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  try {
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(req.body.currentPassword))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }
    user.password = req.body.newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /api/auth/admins — List all admins (superadmin only) ─────────────────
router.get('/admins', protect, authorize('superadmin'), async (req, res) => {
  try {
    const admins = await User.find({}).select('-password -refreshToken').sort({ createdAt: -1 });
    res.json({ success: true, data: admins });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST /api/auth/admins — Create new admin (superadmin only) ───────────────
router.post('/admins', protect, authorize('superadmin'), [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 chars'),
  body('allowedPages').optional().isArray(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  try {
    const { name, email, password, allowedPages = [] } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email already exists.' });

    const validPages = allowedPages.filter(p => ALL_PAGES.includes(p));
    const user = await User.create({
      name, email, password, role: 'admin',
      allowedPages: validPages,
      accessGrantedAt: new Date(),
    });

    // Notify the new admin
    await createNotification({
      recipient: user._id,
      actor: req.user._id,
      type: 'access_granted',
      title: 'Account Created',
      message: `Your admin account has been created by ${req.user.name}. You now have access to: ${validPages.length > 0 ? validPages.join(', ') : 'no pages yet'}.`,
      meta: { pages: validPages },
    });

    res.status(201).json({
      success: true,
      message: 'Admin created successfully.',
      data: { id: user._id, name: user.name, email: user.email, role: user.role, allowedPages: user.allowedPages, createdAt: user.createdAt }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// ─── PUT /api/auth/admins/:id — Update admin (name, email, password, pages) ───
router.put('/admins/:id', protect, authorize('superadmin'), async (req, res) => {
  try {
    const { name, email, password, allowedPages } = req.body;
    const admin = await User.findById(req.params.id).select('+password');
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found.' });
    if (admin.role === 'superadmin' && admin._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Cannot modify another superadmin.' });
    }

    const oldPages = [...(admin.allowedPages || [])];
    const updates = {};
    if (name) updates.name = name;
    if (email && email !== admin.email) {
      const exists = await User.findOne({ email, _id: { $ne: admin._id } });
      if (exists) return res.status(400).json({ success: false, message: 'Email already in use.' });
      updates.email = email;
    }
    if (password && password.length >= 6) {
      admin.password = password;
      await admin.save(); // triggers bcrypt hash
    }
    if (allowedPages !== undefined) {
      updates.allowedPages = allowedPages.filter(p => ALL_PAGES.includes(p));
    }

    const updated = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password -refreshToken');

    // Notify about page changes
    if (allowedPages !== undefined) {
      const newPages = updates.allowedPages;
      const added = newPages.filter(p => !oldPages.includes(p));
      const removed = oldPages.filter(p => !newPages.includes(p));
      if (added.length > 0) {
        await createNotification({
          recipient: admin._id,
          actor: req.user._id,
          type: 'page_added',
          title: 'Page Access Granted',
          message: `${req.user.name} granted you access to: ${added.join(', ')}.`,
          meta: { pages: added },
        });
      }
      if (removed.length > 0) {
        await createNotification({
          recipient: admin._id,
          actor: req.user._id,
          type: 'page_removed',
          title: 'Page Access Removed',
          message: `${req.user.name} removed your access to: ${removed.join(', ')}.`,
          meta: { pages: removed },
        });
      }
    }

    res.json({ success: true, message: 'Admin updated.', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// ─── PUT /api/auth/admins/:id/grant — Grant full access (activate) ─────────────
router.put('/admins/:id/grant', protect, authorize('superadmin'), async (req, res) => {
  try {
    const admin = await User.findById(req.params.id);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found.' });

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true, accessGrantedAt: new Date(), $unset: { accessRevokedAt: 1 } },
      { new: true }
    ).select('-password -refreshToken');

    await createNotification({
      recipient: admin._id,
      actor: req.user._id,
      type: 'access_granted',
      title: 'Access Granted',
      message: `Your account access has been restored by ${req.user.name}.`,
    });

    res.json({ success: true, message: 'Access granted.', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── PUT /api/auth/admins/:id/revoke — Revoke access (deactivate immediately) ──
router.put('/admins/:id/revoke', protect, authorize('superadmin'), async (req, res) => {
  try {
    const admin = await User.findById(req.params.id);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found.' });
    if (admin.role === 'superadmin') {
      return res.status(403).json({ success: false, message: 'Cannot revoke superadmin access.' });
    }

    // Immediately invalidate: deactivate + clear refresh token
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false, refreshToken: null, accessRevokedAt: new Date() },
      { new: true }
    ).select('-password -refreshToken');

    await createNotification({
      recipient: admin._id,
      actor: req.user._id,
      type: 'access_revoked',
      title: 'Access Revoked',
      message: `Your account access has been revoked by ${req.user.name}. Please contact the administrator.`,
    });

    res.json({ success: true, message: 'Access revoked immediately.', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── DELETE /api/auth/admins/:id — Delete admin (superadmin only) ─────────────
router.delete('/admins/:id', protect, authorize('superadmin'), async (req, res) => {
  try {
    const admin = await User.findById(req.params.id);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found.' });
    if (admin.role === 'superadmin') {
      return res.status(403).json({ success: false, message: 'Cannot delete superadmin.' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Admin deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /api/auth/notifications — Get own notifications ──────────────────────
router.get('/notifications', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate('actor', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);
    const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
    res.json({ success: true, data: notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── PUT /api/auth/notifications/read-all — Mark all as read ──────────────────
router.put('/notifications/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── PUT /api/auth/notifications/:id/read — Mark single as read ───────────────
router.put('/notifications/:id/read', protect, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
