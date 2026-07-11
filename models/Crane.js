const mongoose = require('mongoose');
const slugify = require('slugify');
const { attachmentSchema, syncPrimaryImage } = require('./shared');

const craneSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, unique: true },
  subtitle: { type: String },
  description: { type: String },
  image: { type: String }, // legacy primary image, kept in sync with images[0]
  images: [{ type: String }],
  attachments: [attachmentSchema],
  badge: { type: String, default: 'PREMIUM FLEET' },
  category: { type: String, enum: ['tower', 'truck-mounted', 'crawler', 'pick-carry', 'awp', 'trailer', 'other'], default: 'other' },
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  specs: { type: Map, of: String },
  features: [{ type: String }],
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
  metaTitle: { type: String },
  metaDescription: { type: String },
}, { timestamps: true });

craneSchema.pre('save', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});
syncPrimaryImage(craneSchema);

module.exports = mongoose.model('Crane', craneSchema);
