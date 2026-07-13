const express = require('express');
const router = express.Router();
const { Client } = require('../models/index');
const { protect } = require('../middleware/auth');
const { broadcastNotification } = require('../utils/notify');

router.get('/', async (req, res) => {
  try {
    const clients = await Client.find({ isActive: true }).sort({ order: 1 });
    res.json({ success: true, data: clients });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/all', protect, async (req, res) => {
  try {
    const clients = await Client.find({}).sort({ order: 1 });
    res.json({ success: true, data: clients });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/', protect, async (req, res) => {
  try {
    const client = await Client.create(req.body);
    broadcastNotification({
      type: 'client_created',
      title: '🤝 New Client Added',
      message: `${req.user.name} added a new client: "${client.name}".`,
      actor: req.user._id,
      page: 'clients',
      meta: { clientId: client._id, clientName: client.name },
    });
    res.status(201).json({ success: true, message: 'Client created', data: client });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
    broadcastNotification({
      type: 'client_updated',
      title: ' Client Updated',
      message: `${req.user.name} updated client: "${client.name}".`,
      actor: req.user._id,
      page: 'clients',
      meta: { clientId: client._id, clientName: client.name },
    });
    res.json({ success: true, message: 'Client updated', data: client });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    broadcastNotification({
      type: 'client_deleted',
      title: '🗑️ Client Deleted',
      message: `${req.user.name} deleted client${client ? ': "' + client.name + '"' : ''}.`,
      actor: req.user._id,
      page: 'clients',
      meta: { clientName: client?.name },
    });
    res.json({ success: true, message: 'Client deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
