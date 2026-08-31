const express = require('express');
const { register, login, sendOTP, verifyOTP, resetPassword, getWorkers } = require('../controllers/authController');
const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);
router.get('/workers', getWorkers);

module.exports = router;