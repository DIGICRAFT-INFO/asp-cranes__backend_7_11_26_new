const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const { protect } = require('../middleware/auth');
const { broadcastNotification } = require('../utils/notify');

// GET /api/blogs - Public
router.get('/', async (req, res) => {
  try {
    const { category, tag, author, search, featured, page = 1, limit = 9 } = req.query;
    const query = { isPublished: true };
    if (category) query.category = { $regex: category, $options: 'i' };
    if (tag) query.tags = { $in: [tag] };
    if (author) query.author = { $regex: author, $options: 'i' };
    if (featured === 'true') query.isFeatured = true;
    if (search) query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { excerpt: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } },
    ];
    const skip = (page - 1) * limit;
    const [blogs, total] = await Promise.all([
      Blog.find(query).populate('categories').sort({ publishedAt: -1 }).skip(skip).limit(Number(limit)),
      Blog.countDocuments(query),
    ]);
    const [categories, tags, authors] = await Promise.all([
      Blog.distinct('category', { isPublished: true }),
      Blog.distinct('tags', { isPublished: true }),
      Blog.distinct('author', { isPublished: true }),
    ]);
    res.json({
      success: true, data: blogs,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
      meta: { categories, tags, authors },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/blogs/all - Admin
router.get('/all', protect, async (req, res) => {
  try {
    const blogs = await Blog.find({}).populate('categories').sort({ createdAt: -1 });
    res.json({ success: true, data: blogs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/blogs/:slug - Public
router.get('/:slug', async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug, isPublished: true }).populate('categories');
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });
    blog.views += 1;
    await blog.save();
    const related = await Blog.find({ category: blog.category, _id: { $ne: blog._id }, isPublished: true }).limit(3);
    res.json({ success: true, data: blog, related });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/blogs - Admin
router.post('/', protect, async (req, res) => {
  try {
    const blog = await (await Blog.create(req.body)).populate('categories');
    broadcastNotification({
      type: 'blog_created',
      title: '📝 New Blog Post Published',
      message: `${req.user.name} published a new blog: "${blog.title}".`,
      actor: req.user._id,
      page: 'blogs',
      meta: { blogId: blog._id, blogTitle: blog.title, slug: blog.slug },
    });
    res.status(201).json({ success: true, message: 'Blog created successfully', data: blog });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'Blog with this title already exists.' });
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/blogs/:id - Admin
router.put('/:id', protect, async (req, res) => {
  try {
    const blog = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('categories');
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });
    broadcastNotification({
      type: 'blog_updated',
      title: '📝 Blog Post Updated',
      message: `${req.user.name} updated blog: "${blog.title}".`,
      actor: req.user._id,
      page: 'blogs',
      meta: { blogId: blog._id, blogTitle: blog.title },
    });
    res.json({ success: true, message: 'Blog updated successfully', data: blog });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/blogs/:id - Admin
router.delete('/:id', protect, async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });
    broadcastNotification({
      type: 'blog_deleted',
      title: '🗑️ Blog Post Deleted',
      message: `${req.user.name} deleted blog: "${blog.title}".`,
      actor: req.user._id,
      page: 'blogs',
      meta: { blogTitle: blog.title },
    });
    res.json({ success: true, message: 'Blog deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
