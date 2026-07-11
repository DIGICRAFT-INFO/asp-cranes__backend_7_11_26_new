const mongoose = require('mongoose');

// Shared sub-schema for non-primary-image media attached to a piece of
// content — videos and PDFs/documents. Images live in their own `images`
// array (plain strings) since that's what every gallery/carousel needs;
// attachments carry a type + display name since they render as
// download/preview links rather than inline pictures.
const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    type: { type: String, enum: ['video', 'document'], required: true },
    name: { type: String }, // original filename, shown in the admin/frontend UI
  },
  { _id: false }
);

// Keeps the legacy singular `image` field in sync with `images[0]` so any
// older code (or a not-yet-updated frontend component) that still reads
// `.image` keeps working exactly as before, while new code can use the
// `.images` array for galleries. Hooked into both `save` (used by
// Model.create()) and `findOneAndUpdate` (used by findByIdAndUpdate),
// since Mongoose does not run `pre('save')` middleware for the latter.
function syncPrimaryImage(schema) {
  schema.pre('save', function (next) {
    if (Array.isArray(this.images) && this.images.length > 0) {
      this.image = this.images[0];
    }
    next();
  });

  schema.pre('findOneAndUpdate', function (next) {
    const update = this.getUpdate() || {};
    const images = update.images || (update.$set && update.$set.images);
    if (Array.isArray(images) && images.length > 0) {
      this.setUpdate({ ...update, image: images[0] });
    }
    next();
  });
}

module.exports = { attachmentSchema, syncPrimaryImage };
