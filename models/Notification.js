const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: {
    type: String,
    enum: [
      'access_granted', 'access_revoked', 'page_added', 'page_removed', 'profile_updated',
      'crane_created', 'crane_updated', 'crane_deleted',
      'service_created', 'service_updated', 'service_deleted',
      'project_created', 'project_updated', 'project_deleted',
      'blog_created', 'blog_updated', 'blog_deleted',
      'career_created', 'career_updated', 'career_deleted',
      'career_application_received',
      'category_created', 'category_updated', 'category_deleted',
      'client_created', 'client_updated', 'client_deleted',
      'faq_created', 'faq_updated', 'faq_deleted',
      'homepage_updated', 'about_updated',
      'contact_received', 'contact_deleted',
      'settings_updated',
      'system',
    ],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  meta: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
