const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true,
    lowercase: true,
    trim: true
  },
  otp: { 
    type: String, 
    required: true,
    trim: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now, 
    expires: 300 // 5 Minutes (300 seconds) me auto-delete ho jayega MongoDB TTL index se
  }
});

// Vercel Serverless Re-compilation Protection
module.exports = mongoose.models.OTP || mongoose.model('OTP', otpSchema);