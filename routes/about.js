const express = require('express');
const router = express.Router();
const { About } = require('../models/index');
const { protect } = require('../middleware/auth');

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
    res.json({ success: true, message: 'About page updated', data: about });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
