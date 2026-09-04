const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// 1. GET ALL TICKETS (Optimized Population + Fallbacks)
router.get('/tickets/all', protect, adminOnly, async (req, res) => {
  try {
    const tickets = await Ticket.find()
      .populate('customer', 'name email')
      .populate('assignedWorker', 'name email department')
      .sort({ createdAt: -1 })
      .lean();

    const formattedTickets = tickets.map((ticket) => {
      return {
        ...ticket,
        // Fallback agar customer relation plain string ho ya null
        customer: ticket.customer || {
          name: ticket.userName || 'Customer',
          email: 'N/A'
        },
        // Fallback agar assignedWorker Object na ho
        assignedWorker: ticket.assignedWorker || (
          ticket.assignedWorkerName ? { name: ticket.assignedWorkerName } : null
        )
      };
    });

    res.status(200).json(formattedTickets);
  } catch (error) {
    console.error('CRITICAL ERROR in /tickets/all:', error);
    res.status(500).json({ message: 'Database query failed', error: error.message });
  }
});

// 2. GET ALL WORKERS
router.get('/users/workers', protect, async (req, res) => {
  try {
    const workers = await User.find({ role: 'worker' }).select('-password').lean();
    res.status(200).json(workers || []);
  } catch (error) {
    console.error('CRITICAL ERROR in /users/workers:', error);
    res.status(500).json({ message: 'Error fetching workers', error: error.message });
  }
});

// 3. UPDATE TICKET STATUS
router.put('/tickets/update-status/:ticketId', protect, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: 'Status field is required' });
    }

    const updatedTicket = await Ticket.findByIdAndUpdate(
      req.params.ticketId,
      { status },
      { new: true }
    );

    if (!updatedTicket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    res.status(200).json(updatedTicket);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update ticket status', error: error.message });
  }
});

// 4. ASSIGN WORKER
router.put('/tickets/assign/:ticketId', protect, adminOnly, async (req, res) => {
  try {
    const { workerId } = req.body;

    if (!workerId) {
      return res.status(400).json({ message: 'Worker ID is required' });
    }

    const updatedTicket = await Ticket.findByIdAndUpdate(
      req.params.ticketId,
      { assignedWorker: workerId, status: 'In Progress' },
      { new: true }
    ).populate('assignedWorker', 'name email department');

    if (!updatedTicket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (req.io) req.io.emit('ticketUpdated', updatedTicket);

    res.status(200).json(updatedTicket);
  } catch (error) {
    res.status(500).json({ message: 'Failed to assign worker', error: error.message });
  }
});

module.exports = router;