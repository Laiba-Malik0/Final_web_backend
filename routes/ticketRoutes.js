const express = require('express');
const { 
  createTicket, 
  getAllTickets,
  getCustomerTickets, 
  getWorkerTickets, 
  updateTicketStatus,
  updateTicket,
  deleteTicket 
} = require('../controllers/ticketController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

// 1. Create Ticket
router.post('/create', protect, createTicket);

// 2. Admin Route: Get All Tickets Stream
router.get('/all', protect, adminOnly, getAllTickets);

// 3. Customer Tickets
router.get('/customer-tickets', protect, getCustomerTickets);

// 4. Worker Routes (Multiple Endpoints for Compatibility)
router.get('/worker-tickets', protect, getWorkerTickets);
router.get('/my-assigned', protect, getWorkerTickets);

// 5. Status Update Routes
router.put('/update-status/:id', protect, updateTicketStatus);
router.put('/status/:id', protect, updateTicketStatus);

// 6. Customer Edit & Delete
router.put('/update/:id', protect, updateTicket);
router.delete('/delete/:id', protect, deleteTicket);

module.exports = router;