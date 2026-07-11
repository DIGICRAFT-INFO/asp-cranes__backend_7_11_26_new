const mongoose = require('mongoose');
const dotenv = require('dotenv');
const slugify = require('slugify');
dotenv.config();

const User = require('../models/User');
const Crane = require('../models/Crane');
const Blog = require('../models/Blog');
const Homepage = require('../models/Homepage');
const { Service, Project, Client, FAQ, About, Career, Category, Settings } = require('../models/index');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // Clear existing data
  await Promise.all([
    User.deleteMany({}), Crane.deleteMany({}), Blog.deleteMany({}),
    Homepage.deleteMany({}), Service.deleteMany({}), Project.deleteMany({}),
    Client.deleteMany({}), FAQ.deleteMany({}), About.deleteMany({}), Settings.deleteMany({}), Career.deleteMany({}), Category.deleteMany({})
  ]);
  console.log('🗑️ Cleared existing data');

  // Create superadmin
  await User.create({ name: 'Super Admin', email: 'superadmin@aspcranes.com', password: 'Admin@123', role: 'superadmin' });
  await User.create({ name: 'Admin', email: 'admin@aspcranes.com', password: 'Admin@123', role: 'admin' });
  console.log('👤 Users created: superadmin@aspcranes.com / Admin@123');

  // Settings
  await Settings.create({
    siteName: 'ASP Cranes',
    tagline: 'We Provide Crane Rental Services',
    email: 'enquiry@aspcranes.com',
    phone: ['+91-20-66744700', '+966 59 705 9690'],
    address: 'Raipur, Chhattisgarh, India',
    socialLinks: { linkedin: '#', facebook: '#', instagram: '#', twitter: '#', youtube: '#' },
    footerLinks: {
      quickLinks: [
        { label: 'Services', href: '/services' },
        { label: 'People', href: '/about' },
        { label: 'Middle East', href: '#' },
        { label: 'Policies', href: '#' },
      ],
      cranes: [
        { label: 'Tower Cranes', href: '/our-cranes/tower-crane' },
        { label: 'Truck-Mounted Cranes', href: '/our-cranes/truck-mounted-crane' },
        { label: 'Crawler Cranes', href: '/our-cranes/crawler-crane' },
        { label: 'Pick & Carry Cranes', href: '/our-cranes/pick-carry-crane' },
      ],
      services: [
        { label: 'Shifting & Loading', href: '/services' },
        { label: 'Winch Handling', href: '/services' },
        { label: 'Material Handling', href: '/services' },
        { label: 'Jacking', href: '/services' },
        { label: 'Operations & Maintenance (O&M)', href: '/services' },
      ],
    },
    seo: { metaTitle: 'ASP Cranes - Professional Crane Rental Services in India', metaDescription: 'ASP Cranes (Aadishakti Projects) provides professional crane rental services across India. Tower cranes, truck-mounted cranes, crawler cranes and more.' }
  });

  // Cranes
  const cranesRaw = [
    { name: 'Tower Crane', subtitle: 'High-Rise Construction Specialist', description: 'Tower cranes provide exceptional height and lifting capacity for high-rise and large-scale construction projects.', image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800', category: 'tower', badge: 'PREMIUM FLEET', isFeatured: true, order: 1, specs: new Map([['Model/Type', 'Hammerhead / Luffing'], ['Lifting Capacity', 'Up to 350 MT'], ['Main Boom Length', '63 Mtr'], ['Jib Length', '30 Mtr']]) },
    { name: 'Truck-Mounted Crane', subtitle: 'Mobile & Versatile Solution', description: 'Highly mobile cranes designed for quick setup and transportation between multiple job sites.', image: 'https://images.unsplash.com/photo-1590487988256-9ed24133863e?w=800', category: 'truck-mounted', badge: 'PREMIUM FLEET', isFeatured: true, order: 2, specs: new Map([['Model/Type', 'Telescopic Hydraulic'], ['Lifting Capacity', '50 MT - 500 MT'], ['Mobility', 'On-Road High Speed']]) },
    { name: 'Crawler Crane', subtitle: 'Heavy-Duty Stability', description: 'Designed for super-heavy lifting, crawler cranes deliver unmatched stability and performance.', image: 'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=800', category: 'crawler', badge: 'PREMIUM FLEET', order: 3 },
    { name: 'Pick & Carry Crane', subtitle: 'Compact Maneuverability', description: 'Compact and versatile cranes suitable for confined spaces, offering smooth maneuverability.', image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800', category: 'pick-carry', badge: 'PREMIUM FLEET', order: 4 },
    { name: 'Aerial Work Platform (AWP)', subtitle: 'Height Access Solutions', description: 'Safe and efficient aerial platforms designed for height access, maintenance, and inspection tasks.', image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800', category: 'awp', badge: 'PREMIUM FLEET', order: 5 },
    { name: 'Multi-Axle Platform Trailer', subtitle: 'Heavy Transport Specialist', description: 'High-capacity trailers built for heavy equipment transportation with safe load distribution.', image: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=800', category: 'trailer', badge: 'PREMIUM FLEET', order: 6 },
  ];
  const cranes = cranesRaw.map(c => ({ ...c, slug: slugify(c.name, { lower: true, strict: true }) }));
  await Crane.insertMany(cranes);
  console.log('🏗️ Cranes seeded');

  // Services
  const servicesRaw = [
    { title: 'Shifting & Loading', description: 'Safe and efficient shifting, loading, and unloading of heavy machinery using advanced lifting techniques.', image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800', icon: 'Truck', order: 1, isFeatured: true },
    { title: 'Crane Rental with Certified Operators', description: 'Wide range of cranes operated by trained and certified professionals ensuring maximum safety.', image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800', icon: 'Settings', order: 2, isFeatured: true },
    { title: 'Aerial Access Solutions', description: 'Reliable aerial platforms and access solutions for high-reach industrial and construction work.', image: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=800', icon: 'Layers', order: 3, isFeatured: true },
    { title: 'Winch Handling', description: 'Professional winch operations for controlled pulling, positioning, and lifting of heavy components.', image: 'https://images.unsplash.com/photo-1590487988256-9ed24133863e?w=800', icon: 'Anchor', order: 4 },
    { title: 'Material Handling', description: 'Complete material handling solutions including lifting, positioning, and movement of heavy materials.', image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800', icon: 'Package', order: 5 },
    { title: 'Jacking (Machine Jacking & Leveling)', description: 'Accurate machine jacking and leveling services for installation, alignment, and relocation of industrial machinery.', image: 'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=800', icon: 'Tool', order: 6 },
    { title: 'Operations & Maintenance (O&M)', description: 'Dedicated O&M services for long-term projects, ensuring equipment uptime, safety compliance, and operational efficiency.', image: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=800', icon: 'Shield', order: 7 },
  ];
  const services = servicesRaw.map(s => ({ ...s, slug: slugify(s.title, { lower: true, strict: true }) }));
  await Service.insertMany(services);
  console.log('⚙️ Services seeded');

  // Projects
  const projects = [
    { title: 'Steel Plant Erection', description: 'Complete crane services for steel plant construction.', image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800', category: 'Infrastructure', location: 'Raipur, CG', year: 2023, isFeatured: true },
    { title: 'Power Plant Maintenance', description: 'Annual maintenance crane services for thermal power plant.', image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800', category: 'Energy', location: 'Korba, CG', year: 2023 },
    { title: 'Bridge Construction Support', description: 'Heavy lifting for bridge segment placement.', image: 'https://images.unsplash.com/photo-1590487988256-9ed24133863e?w=800', category: 'Infrastructure', location: 'Bilaspur, CG', year: 2024 },
    { title: 'Cement Plant Equipment Installation', description: 'Precision installation of heavy cement plant machinery.', image: 'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=800', category: 'Industrial', location: 'Baloda Bazar, CG', year: 2024 },
  ];
  await Project.insertMany(projects);
  console.log('📁 Projects seeded');

  // Clients
  const clients = [
    { name: 'L&T', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Larsen_%26_Toubro_Logo.svg', order: 1 },
    { name: 'Tata', logo: 'https://upload.wikimedia.org/wikipedia/commons/8/8e/Tata_logo.svg', order: 2 },
    { name: 'BHEL', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2d/BHEL_logo.svg', order: 3 },
    { name: 'ONGC', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4f/ONGC_Logo.svg', order: 4 },
    { name: 'Indian Oil', logo: 'https://upload.wikimedia.org/wikipedia/commons/9/9b/Indian_Oil_Logo.svg', order: 5 },
    { name: 'GAIL', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/18/GAIL_Logo.svg', order: 6 },
    { name: 'UltraTech', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f6/UltraTech_Cement_Logo.svg', order: 7 },
    { name: 'Adani', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4c/Adani_logo.svg', order: 8 },
    { name: 'JSW', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/JSW_Group_logo.svg', order: 9 },
    { name: 'Reliance', logo: 'https://upload.wikimedia.org/wikipedia/en/9/9b/Reliance_Industries_Logo.svg', order: 10 },
    { name: 'ACC', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/ACC_Limited_logo.svg', order: 11 },
    { name: 'Vedanta', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/59/Vedanta_Logo.svg', order: 12 },
  ];
  await Client.insertMany(clients);
  console.log('🤝 Clients seeded');

  // FAQs
  const faqs = [
    { question: 'Do you provide crane operators?', answer: 'Yes, all equipment rentals include experienced and certified operators.', order: 1 },
    { question: 'Can you handle large industrial projects?', answer: 'Absolutely. Our fleet and technical team are equipped for complex and heavy-duty projects.', order: 2 },
    { question: 'Is safety compliance ensured?', answer: 'Yes, safety is our top priority with regular inspections and standard operating procedures.', order: 3 },
    { question: 'What is your service coverage area?', answer: 'We provide services across major industrial regions in India with rapid deployment capabilities.', order: 4 },
    { question: 'Do you offer emergency rental services?', answer: 'Yes, we have 24/7 emergency support with quick mobilization for urgent requirements.', order: 5 },
    { question: 'What types of cranes are available?', answer: 'We offer Tower Cranes, Truck-Mounted Cranes, Crawler Cranes, Pick & Carry Cranes, Aerial Work Platforms, and Multi-Axle Platform Trailers.', order: 6 },
  ];
  await FAQ.insertMany(faqs);
  console.log('❓ FAQs seeded');

  // Blogs
  const blogsRaw = [
    {
      title: 'Top 5 Safety Protocols for High-Rise Lifts',
      excerpt: 'Ensuring crew safety and load stability during complex urban maneuvers.',
      content: 'Working at height presents unique challenges...',
      image: 'https://images.unsplash.com/photo-1545127398-14699f92334b?w=800',
      category: 'Safety',
      tags: ['safety', 'high-rise', 'protocols', 'construction'],
      author: 'ASP Cranes Team',
      isPublished: true,
      isFeatured: true,
    },
    {
      title: 'Mobile vs. Tower Cranes: Choosing the Right Rig',
      excerpt: 'A comprehensive guide to selecting the most cost-effective crane for your project.',
      content: 'Choosing the right crane is critical for project success...',
      image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800',
      category: 'Fleet',
      tags: ['mobile crane', 'tower crane', 'selection', 'guide'],
      author: 'Engineering Team',
      isPublished: true,
      isFeatured: true,
    },
    {
      title: 'The Future of Remote-Operated Lifting',
      excerpt: 'How digital twins and IoT are revolutionizing efficiency on modern construction sites.',
      content: 'Technology is transforming the crane industry...',
      image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800',
      category: 'Innovation',
      tags: ['IoT', 'digital twins', 'technology', 'future'],
      author: 'Tech Team',
      isPublished: true,
    },
  ];
  const blogs = blogsRaw.map(b => ({ ...b, slug: slugify(b.title, { lower: true, strict: true }) }));
  await Blog.insertMany(blogs);
  console.log('📝 Blogs seeded');

  // Categories (tag lists for the checklist multi-select in each admin form)
  const categoryDocsRaw = [
    { name: 'Featured Fleet', type: 'crane', order: 1 },
    { name: 'New Arrival', type: 'crane', order: 2 },
    { name: 'Heavy Duty', type: 'crane', order: 3 },
    { name: 'Popular', type: 'service', order: 1 },
    { name: 'On-Site', type: 'service', order: 2 },
    { name: 'Infrastructure', type: 'project', order: 1 },
    { name: 'Energy', type: 'project', order: 2 },
    { name: 'Industrial', type: 'project', order: 3 },
    { name: 'Safety', type: 'blog', order: 1 },
    { name: 'Fleet Updates', type: 'blog', order: 2 },
    { name: 'Company News', type: 'blog', order: 3 },
  ];
  const categoryDocs = categoryDocsRaw.map(c => ({ ...c, slug: slugify(c.name, { lower: true, strict: true }) }));
  await Category.insertMany(categoryDocs);
  console.log('🏷️  Categories seeded');

  // Careers
  const careersRaw = [
    {
      title: 'Crane Operator',
      department: 'Operations',
      location: 'Raipur, Chhattisgarh',
      employmentType: 'Full-time',
      experience: '3-5 years',
      description: 'Operate tower, truck-mounted, and crawler cranes on active construction and industrial sites, following all safety protocols.',
      responsibilities: ['Operate assigned crane equipment safely and efficiently', 'Perform pre-shift inspections and basic maintenance checks', 'Coordinate with site supervisors and riggers'],
      requirements: ['Valid crane operator license', '3+ years of hands-on experience', 'Strong understanding of load charts and safety procedures'],
      order: 1,
    },
    {
      title: 'Site Safety Officer',
      department: 'Safety & Compliance',
      location: 'Multiple Sites, India',
      employmentType: 'Full-time',
      experience: '2-4 years',
      description: 'Ensure all lifting operations comply with safety regulations and company standard operating procedures.',
      responsibilities: ['Conduct regular site safety audits', 'Enforce PPE and safety compliance', 'Investigate and report incidents'],
      requirements: ['NEBOSH or equivalent safety certification', 'Experience in construction or heavy equipment industry'],
      order: 2,
    },
    {
      title: 'Mechanical Maintenance Technician',
      department: 'Fleet Maintenance',
      location: 'Raipur, Chhattisgarh',
      employmentType: 'Full-time',
      experience: '2-6 years',
      description: 'Maintain and repair our fleet of cranes and heavy equipment to keep operations running smoothly.',
      responsibilities: ['Perform scheduled preventive maintenance', 'Diagnose and repair mechanical/hydraulic faults', 'Maintain maintenance logs and spare-part inventory'],
      requirements: ['ITI/Diploma in Mechanical Engineering or equivalent experience', 'Experience with hydraulic heavy equipment'],
      order: 3,
    },
  ];
  const ts = Date.now().toString();
  const careers = careersRaw.map((c, i) => ({ ...c, slug: slugify(`${c.title}-${ts.slice(-5)}${i}`, { lower: true, strict: true }) }));
  await Career.insertMany(careers);
  console.log('💼 Careers seeded');

  // Homepage content
  await Homepage.create({
    hero: {
      slides: [
        { title: 'Tower Cranes', subtitle: 'WE PROVIDE CRANE RENTAL SERVICES', description: 'Powerful and stable tower cranes built for high-rise construction projects.', btn1Text: 'About Company', btn1Link: '/about', btn2Text: 'Get a Quote', btn2Link: '/contact', image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600', order: 1, isActive: true },
        { title: 'Truck-Mounted Cranes', subtitle: 'WE PROVIDE CRANE RENTAL SERVICES', description: 'Truck-mounted cranes offering fast mobility and efficient heavy lifting.', btn1Text: 'About Company', btn1Link: '/about', btn2Text: 'Get a Quote', btn2Link: '/contact', image: 'https://images.unsplash.com/photo-1590487988256-9ed24133863e?w=1600', order: 2, isActive: true },
        { title: 'Aerial Work Platforms (AWP)', subtitle: 'WE PROVIDE CRANE RENTAL SERVICES', description: 'Safe and efficient aerial platforms designed for height access and maintenance.', btn1Text: 'About Company', btn1Link: '/about', btn2Text: 'Get a Quote', btn2Link: '/contact', image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1600', order: 3, isActive: true },
      ]
    },
    about: {
      tagline: 'ABOUT US',
      title: 'Our Commitment To Excellence In Construction And Design',
      paragraphs: [
        'ASP Cranes (Aadishakti Projects) is a professionally managed crane rental company headquartered in Raipur, Chhattisgarh. We specialize in providing advanced lifting solutions using a diverse fleet of cranes and access equipment, supported by skilled manpower and strict safety protocols.',
        'We operate across India and cater to infrastructure developers, EPC contractors, power plants, steel plants, cement industries, and manufacturing units.',
        'Founded with a vision to support India\'s growing infrastructure sector, ASP Cranes is part of the Rajdev Group — a diversified business group with experience across logistics, construction support, and heavy engineering services.',
      ],
      btnText: 'About Us',
      btnLink: '/about',
    },
  });
  console.log('🏠 Homepage content seeded');

  console.log('\n✅ Database seeded successfully!');
  console.log('📧 Login: superadmin@aspcranes.com | admin@aspcranes.com');
  console.log('🔑 Password: Admin@123');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed Error:', err);
  process.exit(1);
});
