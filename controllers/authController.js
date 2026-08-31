const User = require('../models/User');
const OTP = require('../models/OTP');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmailTest');

// Register
exports.register = async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    if (role === 'admin') return res.status(400).json({ message: 'Cannot register as Admin' });

    const hashedPassword = await bcrypt.hash(password, 10);
    user = await User.create({ name, email, password: hashedPassword, role });

    res.status(201).json({ message: 'Registration successful' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Login
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid Credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid Credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Send OTP
exports.sendOTP = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'No account with this email' });

    const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.deleteMany({ email }); // Clear existing OTPs
    await OTP.create({ email, otp: generatedOTP });

    await sendEmail(email, 'SupportSphere - Password Reset OTP', `Your Password Reset OTP is: ${generatedOTP}. It expires in 5 minutes.`);
    res.json({ message: 'OTP sent to your email' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const validOtp = await OTP.findOne({ email, otp });
    if (!validOtp) return res.status(400).json({ message: 'Invalid or Expired OTP' });

    res.json({ message: 'OTP Verified successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    const validOtp = await OTP.findOne({ email, otp });
    if (!validOtp) return res.status(400).json({ message: 'Session expired. Try OTP again.' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate({ email }, { password: hashedPassword });
    await OTP.deleteMany({ email });

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Fetch Workers List for Customer Dropdown
exports.getWorkers = async (req, res) => {
  try {
    const workers = await User.find({ role: 'worker' }).select('_id name email');
    res.json(workers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};