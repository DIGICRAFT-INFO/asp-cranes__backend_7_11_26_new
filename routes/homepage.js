const express = require('express');
const router = express.Router();
const Homepage = require('../models/Homepage');
const { protect } = require('../middleware/auth');
const { broadcastNotification } = require('../utils/notify');

// GET /api/homepage - Public
router.get('/', async (req, res) => {
  try {
    let homepage = await Homepage.findOne();
    if (!homepage) homepage = await Homepage.create({});
    res.json({ success: true, data: homepage });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/homepage - Admin only
router.put('/', protect, async (req, res) => {
  try {
    let homepage = await Homepage.findOne();
    if (!homepage) {
      homepage = await Homepage.create(req.body);
    } else {
      homepage = await Homepage.findByIdAndUpdate(homepage._id, req.body, { new: true, runValidators: true });
    }
    broadcastNotification({
      type: 'homepage_updated',
      title: '🏠 Homepage Updated',
      message: `${req.user.name} updated the homepage content.`,
      actor: req.user._id,
      page: 'homepage',
    });
    res.json({ success: true, message: 'Homepage updated successfully', data: homepage });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/homepage/section/:sectionName - Update specific section
router.put('/section/:sectionName', protect, async (req, res) => {
  try {
    const { sectionName } = req.params;
    let homepage = await Homepage.findOne();
    if (!homepage) homepage = await Homepage.create({});
    homepage[sectionName] = { ...homepage[sectionName], ...req.body };
    await homepage.save();
    broadcastNotification({
      type: 'homepage_updated',
      title: '🏠 Homepage Section Updated',
      message: `${req.user.name} updated homepage section: "${sectionName}".`,
      actor: req.user._id,
      page: 'homepage',
      meta: { section: sectionName },
    });
    res.json({ success: true, message: `${sectionName} updated successfully`, data: homepage });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
