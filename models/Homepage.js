const mongoose = require('mongoose');

const homepageSchema = new mongoose.Schema({
  hero: {
    slides: [{
      title: { type: String, required: true },
      subtitle: { type: String },
      description: { type: String },
      btn1Text: { type: String, default: 'About Company' },
      btn1Link: { type: String, default: '/about' },
      btn2Text: { type: String, default: 'Get a Quote' },
      btn2Link: { type: String, default: '/contact' },
      image: { type: String },
      order: { type: Number, default: 0 },
      isActive: { type: Boolean, default: true },
    }]
  },
  about: {
    tagline: { type: String, default: 'ABOUT US' },
    title: { type: String },
    paragraphs: [{ type: String }],
    btnText: { type: String, default: 'About Us' },
    btnLink: { type: String, default: '/about' },
    image: { type: String },
  },
  whoWeAre: {
    title: { type: String, default: 'WHO WE ARE' },
    cards: [{
      title: { type: String },
      description: { type: String },
      image: { type: String },
      link: { type: String, default: '/' },
    }]
  },
  services: {
    tagline: { type: String, default: 'OUR SERVICES' },
    title: { type: String, default: 'Reliable Solutions for Heavy & Industrial Operations' },
    btnText: { type: String, default: 'See More' },
    btnLink: { type: String, default: '/services' },
  },
  projects: {
    title: { type: String, default: 'OUR PROJECTS' },
    subtitle: { type: String },
  },
  advantages: {
    title: { type: String, default: 'Advantages of Renting' },
    subtitle: { type: String, default: 'through the ASP Cranes platform' },
    customerPoints: [{ type: String }],
    rentalPoints: [{ type: String }],
    image: { type: String },
    btnText: { type: String, default: 'Register Now' },
  },
  clients: {
    tagline: { type: String, default: 'TRUSTED PARTNERS' },
    title: { type: String, default: 'Our Clients' },
    subtitle: { type: String },
  },
  blog: {
    title: { type: String, default: 'Industry Insights' },
    subtitle: { type: String, default: 'Expert trends, analysis, and updates across industries' },
    btnText: { type: String, default: 'Know More' },
  },
  faq: {
    tagline: { type: String, default: 'GOT QUESTIONS?' },
    title: { type: String, default: 'Frequently Asked Questions' },
    subtitle: { type: String },
  },
  cta: {
    title: { type: String, default: 'Need to rent a crane?' },
    subtitle: { type: String },
    btnText: { type: String, default: 'Register Now' },
    image: { type: String },
  },
}, { timestamps: true });

module.exports = mongoose.model('Homepage', homepageSchema);
