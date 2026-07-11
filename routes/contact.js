const express = require('express');
const router = express.Router();
const { Contact } = require('../models/index');
const { protect } = require('../middleware/auth');

// POST /api/contact - Public (submit form)
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, inquiry, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email, and message are required.' });
    }
    const contact = await Contact.create({
      name, email, phone, inquiry, message,
      ipAddress: req.ip
    });

    // Optional: send email notification
    // await sendContactEmail(contact);

    res.status(201).json({ success: true, message: 'Thank you! We will get back to you soon.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/contact - Admin only
router.get('/', protect, async (req, res) => {
  try {
    const { isRead, page = 1, limit = 20 } = req.query;
    const query = {};
    if (isRead !== undefined) query.isRead = isRead === 'true';
    const skip = (page - 1) * limit;
    const [contacts, total] = await Promise.all([
      Contact.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Contact.countDocuments(query)
    ]);
    res.json({ success: true, data: contacts, pagination: { page: Number(page), limit: Number(limit), total } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/contact/:id - Mark as read
router.put('/:id', protect, async (req, res) => {
  try {
    const contact = await Contact.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: contact });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/contact/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Contact deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
