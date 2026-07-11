// routes/careers.js
const express = require('express');
const router = express.Router();
const { Career } = require('../models/index');
const { protect } = require('../middleware/auth');

// GET /api/careers - Public (active openings only)
router.get('/', async (req, res) => {
  try {
    const { department } = req.query;
    const query = { isActive: true };
    if (department && department !== 'All') query.department = department;
    const careers = await Career.find(query).sort({ order: 1, createdAt: -1 });
    const departments = await Career.distinct('department', { isActive: true });
    res.json({ success: true, data: careers, departments });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/careers/all - Admin (includes inactive/closed roles)
router.get('/all', protect, async (req, res) => {
  try {
    const careers = await Career.find({}).sort({ order: 1, createdAt: -1 });
    res.json({ success: true, data: careers });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/careers/:slug - Public
router.get('/:slug', async (req, res) => {
  try {
    const career = await Career.findOne({ slug: req.params.slug, isActive: true });
    if (!career) return res.status(404).json({ success: false, message: 'Job opening not found' });
    res.json({ success: true, data: career });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/careers - Admin
router.post('/', protect, async (req, res) => {
  try {
    const career = await Career.create(req.body);
    res.status(201).json({ success: true, message: 'Job opening created', data: career });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PUT /api/careers/:id - Admin
router.put('/:id', protect, async (req, res) => {
  try {
    const career = await Career.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!career) return res.status(404).json({ success: false, message: 'Job opening not found' });
    res.json({ success: true, message: 'Job opening updated', data: career });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// DELETE /api/careers/:id - Admin
router.delete('/:id', protect, async (req, res) => {
  try {
    const career = await Career.findByIdAndDelete(req.params.id);
    if (!career) return res.status(404).json({ success: false, message: 'Job opening not found' });
    res.json({ success: true, message: 'Job opening deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
