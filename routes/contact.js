const express = require('express');
const router = express.Router();
const { Contact } = require('../models/index');
const { protect } = require('../middleware/auth');
const { broadcastNotification } = require('../utils/notify');
const { sendContactReply, sendBulkEmail, isMailConfigured } = require('../utils/mailer');

// POST /api/contact - Public (submit form)
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, inquiry, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email, and message are required.' });
    }
    const contact = await Contact.create({ name, email, phone, inquiry, message, ipAddress: req.ip });

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

// GET /api/contact - Admin only (with search, filter, pagination)
router.get('/', protect, async (req, res) => {
  try {
    const { isRead, isReplied, search, page = 1, limit = 50 } = req.query;
    const query = {};
    if (isRead !== undefined) query.isRead = isRead === 'true';
    if (isReplied !== undefined) query.isReplied = isReplied === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { inquiry: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
      ];
    }
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

// GET /api/contact/:id - Single contact
router.get('/:id', protect, async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });
    res.json({ success: true, data: contact });
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

// POST /api/contact/:id/reply - Send email reply to a contact
router.post('/:id/reply', protect, async (req, res) => {
  try {
    const { subject, body, cc, bcc, fromEmail } = req.body;
    if (!subject || !body) {
      return res.status(400).json({ success: false, message: 'Subject and body are required.' });
    }

    const contact = await Contact.findById(req.params.id);
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });

    // Send email
    await sendContactReply({
      to: contact.email,
      toName: contact.name,
      from: fromEmail || process.env.SMTP_USER,
      subject,
      body,
      cc,
      bcc,
    });

    // Save reply history + mark as replied
    contact.isReplied = true;
    contact.isRead = true;
    contact.replyHistory = contact.replyHistory || [];
    contact.replyHistory.push({
      subject,
      body,
      cc: cc || '',
      bcc: bcc || '',
      sentBy: req.user?.email || fromEmail || process.env.SMTP_USER,
      sentAt: new Date(),
    });
    await contact.save();

    broadcastNotification({
      type: 'contact_replied',
      title: '✉️ Reply Sent',
      message: `${req.user.name} replied to ${contact.name} (${contact.email}).`,
      actor: req.user._id,
      page: 'contacts',
    });

    res.json({ success: true, message: 'Reply sent successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/contact/bulk-email - Send bulk email to selected contacts
router.post('/bulk-email', protect, async (req, res) => {
  try {
    const { contactIds, subject, body, cc, bcc, senderEmail } = req.body;
    if (!contactIds?.length || !subject || !body) {
      return res.status(400).json({ success: false, message: 'contactIds, subject and body are required.' });
    }

    const contacts = await Contact.find({ _id: { $in: contactIds } });
    if (!contacts.length) return res.status(404).json({ success: false, message: 'No contacts found.' });

    const recipients = contacts.map(c => ({ email: c.email, name: c.name }));
    const results = await sendBulkEmail({ recipients, subject, body, cc, bcc, senderEmail });

    // Mark all as replied
    const sentIds = contacts.map(c => c._id);
    await Contact.updateMany(
      { _id: { $in: sentIds } },
      { $set: { isReplied: true, isRead: true } }
    );

    broadcastNotification({
      type: 'bulk_email_sent',
      title: '📧 Bulk Email Sent',
      message: `${req.user.name} sent bulk email to ${contacts.length} contacts.`,
      actor: req.user._id,
      page: 'contacts',
    });

    res.json({ success: true, message: `Bulk email sent to ${contacts.length} contacts.`, results });
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

// DELETE /api/contact/bulk - Delete multiple contacts
router.delete('/bulk', protect, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids?.length) return res.status(400).json({ success: false, message: 'No IDs provided.' });
    await Contact.deleteMany({ _id: { $in: ids } });
    res.json({ success: true, message: `${ids.length} contacts deleted.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/contact/check-smtp - Check if SMTP is configured
router.get('/check-smtp', protect, async (req, res) => {
  res.json({ success: true, configured: isMailConfigured(), user: process.env.SMTP_USER || null });
});

module.exports = router;
