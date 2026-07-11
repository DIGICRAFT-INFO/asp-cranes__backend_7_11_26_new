const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ALL_PAGES = [
  'homepage', 'about', 'cranes', 'services', 'projects',
  'blogs', 'careers', 'categories', 'clients', 'faqs', 'contacts', 'settings'
];

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },
  role: { type: String, enum: ['superadmin', 'admin'], default: 'admin' },
  isActive: { type: Boolean, default: true },
  refreshToken: { type: String, select: false },
  lastLogin: { type: Date },
  avatar: { type: String, default: '' },
  // RBAC: which pages this admin can access (superadmin always has all)
  allowedPages: {
    type: [{ type: String, enum: ALL_PAGES }],
    default: [],
  },
  // track when access was granted/revoked
  accessGrantedAt: { type: Date },
  accessRevokedAt: { type: Date },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
module.exports.ALL_PAGES = ALL_PAGES;
