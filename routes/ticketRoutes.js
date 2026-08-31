const express = require('express');
const { createTicket, getCustomerTickets, getWorkerTickets, updateTicketStatus } = require('../controllers/ticketController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/create', protect, createTicket);
router.get('/customer-tickets', protect, getCustomerTickets);
router.get('/worker-tickets', protect, getWorkerTickets);
router.put('/update-status/:id', protect, updateTicketStatus);

module.exports = router;