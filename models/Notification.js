const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // who receives this notification
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // who triggered the action (superadmin)
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: {
    type: String,
    enum: ['access_granted', 'access_revoked', 'page_added', 'page_removed', 'profile_updated', 'system'],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  meta: { type: mongoose.Schema.Types.Mixed }, // extra data like pages affected
}, { timestamps: true });

// index for fast queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
