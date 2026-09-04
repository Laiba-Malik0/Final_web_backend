const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const { protect, authorize } = require('../middleware/authMiddleware');

// GET Real-time Stats Analytics Route
router.get('/', protect, authorize('admin', 'worker', 'customer'), async (req, res) => {
  try {
    // Database se dynamic real-time ticket analytics count karein
    const totalTickets = await Ticket.countDocuments();
    const pendingTickets = await Ticket.countDocuments({ status: 'Pending' });
    const inProgressTickets = await Ticket.countDocuments({ status: 'In Progress' });
    const resolvedTickets = await Ticket.countDocuments({ 
      status: { $in: ['Approved', 'Completed'] } 
    });
    const rejectedTickets = await Ticket.countDocuments({ status: 'Rejected' });

    res.status(200).json({
      success: true,
      message: "Stats loaded successfully",
      stats: {
        totalTickets,
        pendingTickets,
        inProgressTickets,
        resolvedTickets,
        rejectedTickets
      }
    });
  } catch (error) {
    console.error("Stats API Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to load dashboard stats", 
      error: error.message 
    });
  }
});

module.exports = router;