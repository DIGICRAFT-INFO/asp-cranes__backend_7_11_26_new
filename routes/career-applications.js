const express = require('express');
const router = express.Router();
const { CareerApplication, Career, Settings } = require('../models/index');
const { protect } = require('../middleware/auth');
const { broadcastNotification } = require('../utils/notify');
const { sendCareerApplicationConfirmation } = require('../utils/mailer');

// ─── POST /api/career-applications — Public (submit application) ──────────────
router.post('/', async (req, res) => {
  try {
    const { careerId, name, email, phone, coverLetter } = req.body;
    if (!careerId || !name || !email || !coverLetter) {
      return res.status(400).json({
        success: false,
        message: 'Career ID, name, email, and cover letter are required.',
      });
    }

    // Verify the job exists and is still open
    const job = await Career.findOne({ _id: careerId, isActive: true });
    if (!job) {
      return res.status(404).json({ success: false, message: 'This job opening is no longer available.' });
    }

    const application = await CareerApplication.create({
      careerId,
      jobTitle: job.title,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || '',
      coverLetter: coverLetter.trim(),
      ipAddress: req.ip,
    });

    // Notify all superadmins + careers-page admins
    broadcastNotification({
      type: 'career_application_received',
      title: '📋 New Job Application',
      message: `${name} applied for "${job.title}".`,
      actor: null,
      page: 'careers',
      meta: { applicationId: application._id, applicantName: name, jobTitle: job.title },
    });

    // Send confirmation email to applicant using SMTP from settings or env
    const settings = await Settings.findOne().select('email').lean();
    sendCareerApplicationConfirmation({
      to: email,
      applicantName: name,
      jobTitle: job.title,
      companyEmail: settings?.email || process.env.CONTACT_RECEIVER,
    });

    res.status(201).json({
      success: true,
      message: 'Your application has been submitted successfully! We will get back to you soon.',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/career-applications — Admin (list all applications) ─────────────
router.get('/', protect, async (req, res) => {
  try {
    const { careerId, isRead, page = 1, limit = 20 } = req.query;
    const query = {};
    if (careerId) query.careerId = careerId;
    if (isRead !== undefined) query.isRead = isRead === 'true';

    const skip = (page - 1) * limit;
    const [applications, total] = await Promise.all([
      CareerApplication.find(query)
        .populate('careerId', 'title department')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      CareerApplication.countDocuments(query),
    ]);

    const unreadCount = await CareerApplication.countDocuments({ isRead: false });

    res.json({
      success: true,
      data: applications,
      unreadCount,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/career-applications/:id/read — Mark as read ────────────────────
router.put('/:id/read', protect, async (req, res) => {
  try {
    const application = await CareerApplication.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    if (!application) return res.status(404).json({ success: false, message: 'Application not found.' });
    res.json({ success: true, data: application });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/career-applications/read-all — Mark all as read ────────────────
router.put('/read-all', protect, async (req, res) => {
  try {
    await CareerApplication.updateMany({ isRead: false }, { isRead: true });
    res.json({ success: true, message: 'All applications marked as read.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE /api/career-applications/:id — Delete application ────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    await CareerApplication.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Application deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
