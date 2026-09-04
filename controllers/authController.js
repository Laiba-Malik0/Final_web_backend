const User = require('../models/User');
const OTP = require('../models/OTP');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmailTest');

// 1. Register User
exports.register = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
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

    const hashedPassword = await bcrypt.hash(cleanPassword, 10);
    user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: role || 'customer'
    });

    res.status(201).json({ message: 'Registration successful' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 2. Login (With Safe Auto-Admin Seed & Role Validation)
exports.login = async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  try {
    let user = await User.findOne({ email: cleanEmail });

    // --- AUTO-SEED ADMIN IF NOT EXISTS ---
    if (!user && cleanEmail === 'admin@supportsphere.com' && cleanPassword === 'admin123') {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      user = await User.create({
        name: 'System Admin',
        email: 'admin@supportsphere.com',
        password: hashedPassword,
        role: 'admin'
      });
    }

    if (!user) return res.status(400).json({ message: 'Invalid Credentials' });

    // Optional Role Validation Check
    if (role && user.role !== role) {
      return res.status(400).json({
        message: `This account is registered as ${user.role.toUpperCase()}, not ${role.toUpperCase()}`
      });
    }

    const isMatch = await bcrypt.compare(cleanPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid Credentials' });

    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_key';
    const token = jwt.sign({ id: user._id, role: user.role }, jwtSecret, { expiresIn: '1d' });

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 3. Send OTP
exports.sendOTP = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  const cleanEmail = email.trim().toLowerCase();

  try {
    const user = await User.findOne({ email: cleanEmail });
    if (!user) return res.status(404).json({ message: 'No account with this email' });

    const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.deleteMany({ email: cleanEmail });
    await OTP.create({ email: cleanEmail, otp: generatedOTP });

    await sendEmail(cleanEmail, 'SupportSphere - Password Reset OTP', `Your Password Reset OTP is: ${generatedOTP}. It expires in 5 minutes.`);
    res.json({ message: 'OTP sent to your email' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 4. Verify OTP
exports.verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

  try {
    const validOtp = await OTP.findOne({ email: email.trim().toLowerCase(), otp: otp.trim() });
    if (!validOtp) return res.status(400).json({ message: 'Invalid or Expired OTP' });

    res.json({ message: 'OTP Verified successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 5. Reset Password
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
    const validOtp = await OTP.findOne({ email: cleanEmail, otp: otp.trim() });
    if (!validOtp) return res.status(400).json({ message: 'Session expired. Try OTP again.' });

    const user = await User.findOne({ email: cleanEmail });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const hashedPassword = await bcrypt.hash(cleanPassword, 10);
    user.password = hashedPassword;
    await user.save();

    await OTP.deleteMany({ email: cleanEmail });

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 6. Fetch Workers List
exports.getWorkers = async (req, res) => {
  try {
    const workers = await User.find({ role: 'worker' }).select('_id name email department');
    res.json(workers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};