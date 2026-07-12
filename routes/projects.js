const express = require('express');
const router = express.Router();
const { Project } = require('../models/index');
const { protect } = require('../middleware/auth');
const { broadcastNotification } = require('../utils/notify');

router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const query = { isActive: true };
    if (category && category !== 'All') query.category = category;
    const projects = await Project.find(query).populate('categories').sort({ order: 1, createdAt: -1 });
    const categories = await Project.distinct('category', { isActive: true });
    res.json({ success: true, data: projects, categories });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.get('/all', protect, async (req, res) => {
  try {
    const projects = await Project.find({}).populate('categories').sort({ createdAt: -1 });
    res.json({ success: true, data: projects });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.post('/', protect, async (req, res) => {
  try {
    const project = await (await Project.create(req.body)).populate('categories');
    broadcastNotification({
      type: 'project_created',
      title: '🏆 New Project Added',
      message: `${req.user.name} added a new project: "${project.title}".`,
      actor: req.user._id,
      page: 'projects',
      meta: { projectId: project._id, projectTitle: project.title },
    });
    res.status(201).json({ success: true, message: 'Project created', data: project });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.put('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('categories');
    broadcastNotification({
      type: 'project_updated',
      title: '🏆 Project Updated',
      message: `${req.user.name} updated project: "${project.title}".`,
      actor: req.user._id,
      page: 'projects',
      meta: { projectId: project._id, projectTitle: project.title },
    });
    res.json({ success: true, message: 'Project updated', data: project });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.delete('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    broadcastNotification({
      type: 'project_deleted',
      title: '🗑️ Project Deleted',
      message: `${req.user.name} deleted a project${project ? ': "' + project.title + '"' : ''}.`,
      actor: req.user._id,
      page: 'projects',
      meta: { projectTitle: project?.title },
    });
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
