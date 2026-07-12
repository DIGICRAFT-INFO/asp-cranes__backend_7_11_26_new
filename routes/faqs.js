const express = require('express');
const router = express.Router();
const { FAQ } = require('../models/index');
const { protect } = require('../middleware/auth');
const { broadcastNotification } = require('../utils/notify');

router.get('/', async (req, res) => {
  try {
    const faqs = await FAQ.find({ isActive: true }).sort({ order: 1 });
    res.json({ success: true, data: faqs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/all', protect, async (req, res) => {
  try {
    const faqs = await FAQ.find({}).sort({ order: 1 });
    res.json({ success: true, data: faqs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/', protect, async (req, res) => {
  try {
    const faq = await FAQ.create(req.body);
    broadcastNotification({
      type: 'faq_created',
      title: '❓ New FAQ Added',
      message: `${req.user.name} added a new FAQ: "${faq.question}".`,
      actor: req.user._id,
      page: 'faqs',
      meta: { faqId: faq._id, question: faq.question },
    });
    res.status(201).json({ success: true, message: 'FAQ created', data: faq });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndUpdate(req.params.id, req.body, { new: true });
    broadcastNotification({
      type: 'faq_updated',
      title: '❓ FAQ Updated',
      message: `${req.user.name} updated FAQ: "${faq.question}".`,
      actor: req.user._id,
      page: 'faqs',
      meta: { faqId: faq._id, question: faq.question },
    });
    res.json({ success: true, message: 'FAQ updated', data: faq });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndDelete(req.params.id);
    broadcastNotification({
      type: 'faq_deleted',
      title: '🗑️ FAQ Deleted',
      message: `${req.user.name} deleted FAQ${faq ? ': "' + faq.question + '"' : ''}.`,
      actor: req.user._id,
      page: 'faqs',
      meta: { question: faq?.question },
    });
    res.json({ success: true, message: 'FAQ deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
