const express = require('express');
const router = express.Router();
const { Service } = require('../models/index');
const { protect } = require('../middleware/auth');
const { broadcastNotification } = require('../utils/notify');

router.get('/', async (req, res) => {
  try {
    const services = await Service.find({ isActive: true }).populate('categories').sort({ order: 1 });
    res.json({ success: true, data: services });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.get('/all', protect, async (req, res) => {
  try {
    const services = await Service.find({}).populate('categories').sort({ order: 1 });
    res.json({ success: true, data: services });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.get('/:slug', async (req, res) => {
  try {
    const service = await Service.findOne({ slug: req.params.slug }).populate('categories');
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
    res.json({ success: true, data: service });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.post('/', protect, async (req, res) => {
  try {
    const service = await (await Service.create(req.body)).populate('categories');
    broadcastNotification({
      type: 'service_created',
      title: '⚙️ New Service Added',
      message: `${req.user.name} added a new service: "${service.title}".`,
      actor: req.user._id,
      page: 'services',
      meta: { serviceId: service._id, serviceTitle: service.title },
    });
    res.status(201).json({ success: true, message: 'Service created', data: service });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.put('/:id', protect, async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('categories');
    broadcastNotification({
      type: 'service_updated',
      title: '⚙️ Service Updated',
      message: `${req.user.name} updated service: "${service.title}".`,
      actor: req.user._id,
      page: 'services',
      meta: { serviceId: service._id, serviceTitle: service.title },
    });
    res.json({ success: true, message: 'Service updated', data: service });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.delete('/:id', protect, async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    broadcastNotification({
      type: 'service_deleted',
      title: '🗑️ Service Deleted',
      message: `${req.user.name} deleted a service${service ? ': "' + service.title + '"' : ''}.`,
      actor: req.user._id,
      page: 'services',
      meta: { serviceTitle: service?.title },
    });
    res.json({ success: true, message: 'Service deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
