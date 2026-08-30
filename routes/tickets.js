const express = require('express');
const router = express.Router();
const User = require('../models/User');

// FIX HERE: Object se function bahar nikalne ke liye { auth } use karein
const { auth } = require('../middleware/auth'); 

router.get('/workers', auth, async (req, res) => {
  try {
    const workers = await User.find({ role: 'worker' }).select('-password');
    res.status(200).json(workers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;