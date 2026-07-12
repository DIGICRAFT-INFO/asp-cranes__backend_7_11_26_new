const express = require('express');
const router = express.Router();
const { About } = require('../models/index');
const { protect } = require('../middleware/auth');
const { broadcastNotification } = require('../utils/notify');

router.get('/', async (req, res) => {
  try {
    let about = await About.findOne();
    if (!about) about = await About.create({});
    res.json({ success: true, data: about });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/', protect, async (req, res) => {
  try {
    let about = await About.findOne();
    if (!about) {
      about = await About.create(req.body);
    } else {
      about = await About.findByIdAndUpdate(about._id, req.body, { new: true });
    }
    broadcastNotification({
      type: 'about_updated',
      title: 'ℹ️ About Page Updated',
      message: `${req.user.name} updated the About page content.`,
      actor: req.user._id,
      page: 'about',
    });
    res.json({ success: true, message: 'About page updated', data: about });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
