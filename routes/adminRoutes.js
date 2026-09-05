const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/users/workers', protect, adminOnly, async (req, res) => {
  try {
    const workers = await User.find({ role: 'worker' }).select('-password').lean();
    res.status(200).json(workers || []);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching workers', error: error.message });
  }
});

router.put('/tickets/assign/:ticketId', protect, adminOnly, async (req, res) => {
  try {
    const { workerId } = req.body;
    if (!workerId) return res.status(400).json({ message: 'Worker ID is required' });

    const updatedTicket = await Ticket.findByIdAndUpdate(
      req.params.ticketId,
      { assignedWorker: workerId, status: 'In Progress' },
      { new: true }
    ).populate('assignedWorker', 'name email department');

    if (!updatedTicket) return res.status(404).json({ message: 'Ticket not found' });

    if (req.io) req.io.emit('ticketUpdated', updatedTicket);
    res.status(200).json(updatedTicket);
  } catch (error) {
    res.status(500).json({ message: 'Failed to assign worker', error: error.message });
  }
});

module.exports = router;