const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Check if controller functions exist before assigning
if (adminController.getAdminDashboard) {
  router.get('/dashboard', adminController.getAdminDashboard);
}
if (adminController.addWorker) {
  router.post('/workers/add', adminController.addWorker);
}
if (adminController.updateTicket) {
  router.put('/tickets/update/:ticketId', adminController.updateTicket);
}

module.exports = router;