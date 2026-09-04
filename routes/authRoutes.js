const express = require('express');
const { register, login, sendOTP, verifyOTP, resetPassword, getWorkers } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Public Authentication Routes
router.post('/register', register);
router.post('/login', login);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

// Protected Routes
router.get('/workers', protect, getWorkers);

module.exports = router;