const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Broadcast a notification to all superadmins + all admins with access to `page`.
 * If page is null, sends only to superadmins.
 *
 * @param {Object} opts
 * @param {string}   opts.type     - notification type
 * @param {string}   opts.title    - short title
 * @param {string}   opts.message  - full message
 * @param {ObjectId} opts.actor    - user who triggered the action (req.user._id)
 * @param {string}   [opts.page]   - page key e.g. 'cranes', 'blogs' (null = superadmin only)
 * @param {Object}   [opts.meta]   - extra data
 */
const broadcastNotification = async ({ type, title, message, actor, page = null, meta = {} }) => {
  try {
    // Always notify all superadmins
    const superadmins = await User.find({ role: 'superadmin', isActive: true }).select('_id');

    // Also notify admins who have access to this page (if page specified)
    let admins = [];
    if (page) {
      admins = await User.find({
        role: 'admin',
        isActive: true,
        allowedPages: page,
      }).select('_id');
    }

    // Combine recipients, deduplicate, exclude actor
    const actorStr = actor ? actor.toString() : null;
    const recipientIds = [
      ...superadmins.map(u => u._id),
      ...admins.map(u => u._id),
    ].filter((id, idx, arr) => {
      const s = id.toString();
      return s !== actorStr && arr.findIndex(x => x.toString() === s) === idx;
    });

    if (recipientIds.length === 0) return;

    const docs = recipientIds.map(recipient => ({
      recipient,
      actor,
      type,
      title,
      message,
      meta,
    }));

    await Notification.insertMany(docs);
  } catch (err) {
    console.error('[notify] broadcastNotification error:', err.message);
  }
};

module.exports = { broadcastNotification };
