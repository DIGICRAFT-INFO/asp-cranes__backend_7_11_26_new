// routes/clients.js
const express = require('express');
const router = express.Router();
const { Client } = require('../models/index');
const { protect } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const clients = await Client.find({ isActive: true }).sort({ order: 1 });
    res.json({ success: true, data: clients });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.get('/all', protect, async (req, res) => {
  try {
    const clients = await Client.find({}).sort({ order: 1 });
    res.json({ success: true, data: clients });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.post('/', protect, async (req, res) => {
  try {
    const client = await Client.create(req.body);
    res.status(201).json({ success: true, message: 'Client created', data: client });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.put('/:id', protect, async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, message: 'Client updated', data: client });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.delete('/:id', protect, async (req, res) => {
  try {
    await Client.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Client deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
