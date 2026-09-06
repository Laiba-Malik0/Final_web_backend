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

router.post('/create', protect, createTicket);
router.get('/all', protect, adminOnly, getAllTickets);
router.get('/customer-tickets', protect, getCustomerTickets);
router.get('/worker-tickets', protect, getWorkerTickets);
router.get('/my-assigned', protect, getWorkerTickets);
router.put('/update-status/:id', protect, updateTicketStatus);
router.put('/status/:id', protect, updateTicketStatus);
router.put('/update/:id', protect, updateTicket);
router.delete('/delete/:id', protect, adminOnly, deleteTicket);

module.exports = router;