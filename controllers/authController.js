const User = require('../models/User');
const OTP = require('../models/OTP');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmailTest');

exports.register = async (req, res) => {
  const { name, email, password, role, specialization } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  // Worker ke liye specialization zaroori hai
  if (role === 'worker' && !specialization) {
    return res.status(400).json({ message: 'Please select a specialization for the Worker' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (cleanPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    let user = await User.findOne({ email: cleanEmail });
    if (user) return res.status(400).json({ message: 'User already exists' });

    if (role === 'admin') {
      return res.status(400).json({ message: 'Cannot register directly as Admin' });
    }

    user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: cleanPassword, 
      role: role || 'customer',
      specialization: role === 'worker' ? specialization : ''
    });

    res.status(201).json({ message: 'Registration successful' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  try {
    let user = await User.findOne({ email: cleanEmail });
    const envAdminEmail = (process.env.ADMIN_EMAIL || 'admin@supportsphere.com').toLowerCase().trim();
    const envAdminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (!user && cleanEmail === envAdminEmail && cleanPassword === envAdminPassword) {
      user = new User({
        name: 'System Admin',
        email: envAdminEmail,
        password: envAdminPassword,
        role: 'admin'
      });
      await user.save();
    }

    if (!user) return res.status(400).json({ message: 'Invalid Credentials' });

    if (role && user.role !== role) {
      return res.status(400).json({
        message: `This account is registered as ${user.role.toUpperCase()}, not ${role.toUpperCase()}`
      });
    }

    const isMatch = await bcrypt.compare(cleanPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid Credentials' });

    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_key';
    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name }, 
      jwtSecret, 
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, specialization: user.specialization }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.sendOTP = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  const cleanEmail = email.trim().toLowerCase();

  try {
    const user = await User.findOne({ email: cleanEmail });
    if (!user) return res.status(404).json({ message: 'No account with this email' });

    const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOTP = await bcrypt.hash(generatedOTP, 10);

    await OTP.deleteMany({ email: cleanEmail });
    await OTP.create({ email: cleanEmail, otp: hashedOTP });

    await sendEmail(
      cleanEmail, 
      'SupportSphere - Password Reset OTP', 
      `Your Password Reset OTP is: ${generatedOTP}. It expires in 5 minutes.`
    );
    res.json({ message: 'OTP sent to your email' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

  try {
    const cleanEmail = email.trim().toLowerCase();
    const otpRecord = await OTP.findOne({ email: cleanEmail });

    if (!otpRecord) return res.status(400).json({ message: 'Invalid or Expired OTP' });

    const isValid = await bcrypt.compare(otp.trim(), otpRecord.otp);
    if (!isValid) return res.status(400).json({ message: 'Invalid or Expired OTP' });

    res.json({ message: 'OTP Verified successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: 'Email, OTP, and new password are required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = newPassword.trim();

  if (cleanPassword.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  try {
    const otpRecord = await OTP.findOne({ email: cleanEmail });
    if (!otpRecord) return res.status(400).json({ message: 'Session expired. Try OTP again.' });

    const isValid = await bcrypt.compare(otp.trim(), otpRecord.otp);
    if (!isValid) return res.status(400).json({ message: 'Invalid or Expired OTP' });

    const user = await User.findOne({ email: cleanEmail });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // ✅ FIXED: Direct raw string assign ki hai. 
    // User.js model ka pre('save') hook isey single hashing ke sath safe save karega.
    user.password = cleanPassword; 
    await user.save();

    await OTP.deleteMany({ email: cleanEmail });

    res.json({ message: 'Password updated successfully. Please login with your new password.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Workers ki list mein ab Specialization bhi pass hogi
exports.getWorkers = async (req, res) => {
  try {
    const workers = await User.find({ role: 'worker' }).select('_id name email department specialization');
    res.json(workers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};