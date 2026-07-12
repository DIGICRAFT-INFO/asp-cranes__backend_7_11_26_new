const express = require('express');
const router = express.Router();
const { Settings } = require('../models/index');
const { protect } = require('../middleware/auth');
const { broadcastNotification } = require('../utils/notify');

router.get('/', async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({});
    res.json({ success: true, data: settings });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/', protect, async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create(req.body);
    } else {
      settings = await Settings.findByIdAndUpdate(settings._id, req.body, { new: true });
    }
    broadcastNotification({
      type: 'settings_updated',
      title: '⚙️ Site Settings Updated',
      message: `${req.user.name} updated the site settings.`,
      actor: req.user._id,
      page: 'settings',
    });
    res.json({ success: true, message: 'Settings updated', data: settings });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
