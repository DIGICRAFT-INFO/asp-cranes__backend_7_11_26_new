const express = require('express');
const router = express.Router();
const { Contact } = require('../models/index');
const { protect } = require('../middleware/auth');
const { broadcastNotification } = require('../utils/notify');

// POST /api/contact - Public (submit form)
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, inquiry, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email, and message are required.' });
    }
    const contact = await Contact.create({ name, email, phone, inquiry, message, ipAddress: req.ip });

    // Notify all superadmins + contacts-page admins about new enquiry
    broadcastNotification({
      type: 'contact_received',
      title: '📩 New Contact Enquiry',
      message: `New enquiry from ${name} (${email})${inquiry ? ' — ' + inquiry : ''}.`,
      actor: null,
      page: 'contacts',
      meta: { contactId: contact._id, senderName: name, senderEmail: email, inquiry },
    });

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
      Contact.countDocuments(query),
    ]);
    res.json({ success: true, data: contacts, pagination: { page: Number(page), limit: Number(limit), total } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/contact/:id - Mark as read / update
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
    const contact = await Contact.findByIdAndDelete(req.params.id);
    broadcastNotification({
      type: 'contact_deleted',
      title: '🗑️ Enquiry Deleted',
      message: `${req.user.name} deleted an enquiry${contact ? ' from ' + contact.name : ''}.`,
      actor: req.user._id,
      page: 'contacts',
      meta: { senderName: contact?.name },
    });
    res.json({ success: true, message: 'Contact deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
