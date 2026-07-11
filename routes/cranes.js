const express = require('express');
const router = express.Router();
const Crane = require('../models/Crane');
const { protect } = require('../middleware/auth');

// GET /api/cranes - Public
router.get('/', async (req, res) => {
  try {
    const { category, featured, search, page = 1, limit = 20 } = req.query;
    const query = { isActive: true };
    if (category) query.category = category;
    if (featured === 'true') query.isFeatured = true;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
    const skip = (page - 1) * limit;
    const [cranes, total] = await Promise.all([
      Crane.find(query).populate('categories').sort({ order: 1, createdAt: -1 }).skip(skip).limit(Number(limit)),
      Crane.countDocuments(query)
    ]);
    res.json({ success: true, data: cranes, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/cranes/all - Admin (includes inactive)
router.get('/all', protect, async (req, res) => {
  try {
    const cranes = await Crane.find({}).populate('categories').sort({ order: 1, createdAt: -1 });
    res.json({ success: true, data: cranes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/cranes/:slug - Public
router.get('/:slug', async (req, res) => {
  try {
    const crane = await Crane.findOne({ slug: req.params.slug, isActive: true }).populate('categories');
    if (!crane) return res.status(404).json({ success: false, message: 'Crane not found' });
    res.json({ success: true, data: crane });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/cranes - Admin
router.post('/', protect, async (req, res) => {
  try {
    const crane = await (await Crane.create(req.body)).populate('categories');
    res.status(201).json({ success: true, message: 'Crane created successfully', data: crane });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'Crane with this name already exists.' });
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/cranes/:id - Admin
router.put('/:id', protect, async (req, res) => {
  try {
    const crane = await Crane.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('categories');
    if (!crane) return res.status(404).json({ success: false, message: 'Crane not found' });
    res.json({ success: true, message: 'Crane updated successfully', data: crane });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/cranes/:id - Admin
router.delete('/:id', protect, async (req, res) => {
  try {
    const crane = await Crane.findByIdAndDelete(req.params.id);
    if (!crane) return res.status(404).json({ success: false, message: 'Crane not found' });
    res.json({ success: true, message: 'Crane deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
