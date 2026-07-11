// routes/services.js
const express = require('express');
const router = express.Router();
const { Service } = require('../models/index');
const { protect } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const services = await Service.find({ isActive: true }).populate('categories').sort({ order: 1 });
    res.json({ success: true, data: services });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.get('/all', protect, async (req, res) => {
  try {
    const services = await Service.find({}).populate('categories').sort({ order: 1 });
    res.json({ success: true, data: services });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.get('/:slug', async (req, res) => {
  try {
    const service = await Service.findOne({ slug: req.params.slug }).populate('categories');
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
    res.json({ success: true, data: service });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.post('/', protect, async (req, res) => {
  try {
    const service = await (await Service.create(req.body)).populate('categories');
    res.status(201).json({ success: true, message: 'Service created', data: service });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.put('/:id', protect, async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('categories');
    res.json({ success: true, message: 'Service updated', data: service });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.delete('/:id', protect, async (req, res) => {
  try {
    await Service.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Service deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
