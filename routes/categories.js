const express = require('express');
const router = express.Router();
const { Category } = require('../models/index');
const { protect } = require('../middleware/auth');
const { broadcastNotification } = require('../utils/notify');

const VALID_TYPES = ['crane', 'service', 'project', 'blog'];
const validateType = (type) => VALID_TYPES.includes(type);

router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    const query = { isActive: true };
    if (type) {
      if (!validateType(type)) return res.status(400).json({ success: false, message: `type must be one of: ${VALID_TYPES.join(', ')}` });
      query.type = type;
    }
    const categories = await Category.find(query).sort({ order: 1, name: 1 });
    res.json({ success: true, data: categories });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/all', protect, async (req, res) => {
  try {
    const { type } = req.query;
    const query = {};
    if (type) {
      if (!validateType(type)) return res.status(400).json({ success: false, message: `type must be one of: ${VALID_TYPES.join(', ')}` });
      query.type = type;
    }
    const categories = await Category.find(query).sort({ type: 1, order: 1, name: 1 });
    res.json({ success: true, data: categories });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/', protect, async (req, res) => {
  try {
    const { name, type, order, isActive } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Category name is required' });
    if (!validateType(type)) return res.status(400).json({ success: false, message: `type must be one of: ${VALID_TYPES.join(', ')}` });
    const category = await Category.create({ name: name.trim(), type, order, isActive });
    broadcastNotification({
      type: 'category_created',
      title: '🏷️ New Category Added',
      message: `${req.user.name} added a new ${type} category: "${category.name}".`,
      actor: req.user._id,
      page: 'categories',
      meta: { categoryId: category._id, categoryName: category.name, categoryType: type },
    });
    res.status(201).json({ success: true, message: 'Category created', data: category });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'A category with this name already exists for this content type' });
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    broadcastNotification({
      type: 'category_updated',
      title: '🏷️ Category Updated',
      message: `${req.user.name} updated category: "${category.name}".`,
      actor: req.user._id,
      page: 'categories',
      meta: { categoryId: category._id, categoryName: category.name },
    });
    res.json({ success: true, message: 'Category updated', data: category });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'A category with this name already exists for this content type' });
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    broadcastNotification({
      type: 'category_deleted',
      title: '🗑️ Category Deleted',
      message: `${req.user.name} deleted category: "${category.name}".`,
      actor: req.user._id,
      page: 'categories',
      meta: { categoryName: category.name, categoryType: category.type },
    });
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
