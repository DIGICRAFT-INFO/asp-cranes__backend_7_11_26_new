const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // who receives this notification
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // who triggered the action
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: {
    type: String,
    enum: [
      // ── Access / RBAC ──────────────────────────────
      'access_granted',
      'access_revoked',
      'page_added',
      'page_removed',
      'profile_updated',
      // ── Content: Cranes ───────────────────────────
      'crane_created',
      'crane_updated',
      'crane_deleted',
      // ── Content: Services ─────────────────────────
      'service_created',
      'service_updated',
      'service_deleted',
      // ── Content: Projects ─────────────────────────
      'project_created',
      'project_updated',
      'project_deleted',
      // ── Content: Blog Posts ───────────────────────
      'blog_created',
      'blog_updated',
      'blog_deleted',
      // ── Content: Careers ──────────────────────────
      'career_created',
      'career_updated',
      'career_deleted',
      // ── Content: Categories ───────────────────────
      'category_created',
      'category_updated',
      'category_deleted',
      // ── Content: Clients ──────────────────────────
      'client_created',
      'client_updated',
      'client_deleted',
      // ── Content: FAQs ─────────────────────────────
      'faq_created',
      'faq_updated',
      'faq_deleted',
      // ── Pages (single-doc) ────────────────────────
      'homepage_updated',
      'about_updated',
      // ── Contacts / Enquiries ──────────────────────
      'contact_received',
      'contact_deleted',
      // ── Settings ──────────────────────────────────
      'settings_updated',
      // ── Generic ───────────────────────────────────
      'system',
    ],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  meta: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

// index for fast queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
