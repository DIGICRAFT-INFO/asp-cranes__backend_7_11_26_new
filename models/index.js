const mongoose = require('mongoose');
const slugify = require('slugify');
const { attachmentSchema, syncPrimaryImage } = require('./shared');

// ─── Service Model ────────────────────────────────────────────────────────────
const serviceSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, unique: true },
  subtitle: { type: String },
  description: { type: String },
  image: { type: String }, // legacy primary image, kept in sync with images[0]
  images: [{ type: String }],
  attachments: [attachmentSchema],
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  icon: { type: String },
  features: [{ type: String }],
  externalUrl: { type: String, default: '' }, // optional external link for this service
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
}, { timestamps: true });
serviceSchema.pre('save', function (next) {
  if (this.isModified('title') || !this.slug) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});
syncPrimaryImage(serviceSchema);
const Service = mongoose.model('Service', serviceSchema);

// ─── Project Model ────────────────────────────────────────────────────────────
const projectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: { type: String },
  description: { type: String },
  image: { type: String }, // legacy primary image, kept in sync with images[0]
  images: [{ type: String }],
  attachments: [attachmentSchema],
  category: { type: String, required: true },
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  client: { type: String },
  location: { type: String },
  year: { type: Number },
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
}, { timestamps: true });
syncPrimaryImage(projectSchema);
const Project = mongoose.model('Project', projectSchema);

// ─── Client/Partner Model ─────────────────────────────────────────────────────
const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  logo: { type: String },
  website: { type: String },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
}, { timestamps: true });
const Client = mongoose.model('Client', clientSchema);

// ─── FAQ Model ─────────────────────────────────────────────────────────────────
const faqSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  category: { type: String, default: 'General' },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
}, { timestamps: true });
const FAQ = mongoose.model('FAQ', faqSchema);

// ─── About Model ──────────────────────────────────────────────────────────────
const aboutSchema = new mongoose.Schema({
  section1: {
    tagline: { type: String },
    title: { type: String },
    paragraphs: [{ type: String }],
    btnText: { type: String },
    btnLink: { type: String },
    image: { type: String },
    highlights: [{ type: String }],
  },
  section2: {
    tagline: { type: String },
    title: { type: String },
    paragraphs: [{ type: String }],
    btnText: { type: String },
    btnLink: { type: String },
    image: { type: String },
  },
  mission: { type: String },
  vision: { type: String },
  whoWeAreCards: [{
    title: { type: String },
    description: { type: String },
    image: { type: String },
    link: { type: String },
  }],
  stats: [{
    value: { type: String },
    label: { type: String },
    icon: { type: String },
  }],
  cta: {
    title: { type: String },
    subtitle: { type: String },
    btn1Text: { type: String },
    btn1Link: { type: String },
    btn2Text: { type: String },
    btn2Link: { type: String },
  },
}, { timestamps: true });
const About = mongoose.model('About', aboutSchema);

// ─── Category Model ────────────────────────────────────────────────────────────
// A lightweight, admin-manageable tagging system layered on top of each
// content type's existing primary classification (Crane.category enum,
// Service/Project/Blog.category string). Content items can carry any number
// of these (M:M — a category can apply to many items, an item can carry many
// categories), managed via checklist-style multi-select in the admin forms.
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String },
  type: { type: String, enum: ['crane', 'service', 'project', 'blog'], required: true },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
categorySchema.pre('save', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});
// A given name can be reused across different content types, but not twice
// within the same type.
categorySchema.index({ type: 1, slug: 1 }, { unique: true });
const Category = mongoose.model('Category', categorySchema);

// ─── Career / Job Opening Model ────────────────────────────────────────────────
const careerSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, unique: true },
  department: { type: String, default: 'General' },
  location: { type: String, default: 'On-site' },
  employmentType: {
    type: String,
    enum: ['Full Time', 'Part Time', 'Contract', 'Internship'],
    default: 'Full Time',
  },
  experience: { type: String }, // e.g. "2-4 years"
  description: { type: String },
  responsibilities: [{ type: String }],
  requirements: [{ type: String }],
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
}, { timestamps: true });
careerSchema.pre('save', function (next) {
  if (this.isModified('title') || !this.slug) {
    this.slug = slugify(`${this.title}-${Date.now().toString().slice(-5)}`, { lower: true, strict: true });
  }
  next();
});
const Career = mongoose.model('Career', careerSchema);

// ─── Contact Submission Model ──────────────────────────────────────────────────
const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  inquiry: { type: String },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  isReplied: { type: Boolean, default: false },
  ipAddress: { type: String },
}, { timestamps: true });
const Contact = mongoose.model('Contact', contactSchema);

// ─── Career Application Model ─────────────────────────────────────────────────
const careerApplicationSchema = new mongoose.Schema({
  careerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Career', required: true },
  jobTitle: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  coverLetter: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  ipAddress: { type: String },
}, { timestamps: true });
careerApplicationSchema.index({ careerId: 1, createdAt: -1 });
const CareerApplication = mongoose.model('CareerApplication', careerApplicationSchema);

// ─── Settings Model ────────────────────────────────────────────────────────────
const settingsSchema = new mongoose.Schema({
  siteName: { type: String, default: 'ASP Cranes' },
  logo: { type: String },
  tagline: { type: String },
  email: { type: String },
  phone: [{ type: String }],
  address: { type: String },
  socialLinks: {
    linkedin: { type: String },
    facebook: { type: String },
    instagram: { type: String },
    twitter: { type: String },
    youtube: { type: String },
  },
  footerLinks: {
    quickLinks: [{ label: { type: String }, href: { type: String } }],
    cranes: [{ label: { type: String }, href: { type: String } }],
    services: [{ label: { type: String }, href: { type: String } }],
  },
  seo: {
    metaTitle: { type: String },
    metaDescription: { type: String },
    keywords: [{ type: String }],
  },
}, { timestamps: true });
const Settings = mongoose.model('Settings', settingsSchema);

module.exports = { Service, Project, Client, FAQ, About, Career, CareerApplication, Category, Contact, Settings };
