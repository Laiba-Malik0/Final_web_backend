const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// Nodemailer Transporter Setup (Inline to prevent module missing errors)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const createToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || "fallbacksecretkey",
    { expiresIn: "7d" }
  );
};

// 1. REGISTER CUSTOMER / WORKER
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!["customer", "worker"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: cleanEmail,
      password: hashedPassword,
      role,
    });

    const token = createToken(user);
    res.status(201).json({
      message: "Account created successfully",
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. LOGIN (Customer, Worker, & Admin)
const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: "Email, password and role are required" });
    }

    const cleanEmail = email.toLowerCase().trim();

    // ADMIN LOGIN CHECK
    if (role === "admin") {
      const envAdminEmail = (process.env.ADMIN_EMAIL || "admin@supportflow.com").toLowerCase();
      const envAdminPass = process.env.ADMIN_PASSWORD || "admin123";

      if (cleanEmail === envAdminEmail && password === envAdminPass) {
        const token = jwt.sign(
          { role: "admin", email: envAdminEmail },
          process.env.JWT_SECRET || "fallbacksecretkey",
          { expiresIn: "7d" }
        );

        return res.json({
          message: "Admin login successful",
          token,
          user: { email: envAdminEmail, name: "Administrator", role: "admin" },
        });
      }

      const dbAdmin = await User.findOne({ email: cleanEmail, role: "admin" });
      if (dbAdmin) {
        const validPassword = await bcrypt.compare(password, dbAdmin.password);
        if (validPassword) {
          const token = createToken(dbAdmin);
          return res.json({
            message: "Admin login successful",
            token,
            user: { id: dbAdmin._id, email: dbAdmin.email, name: dbAdmin.name, role: dbAdmin.role },
          });
        }
      }

      return res.status(401).json({ message: "Invalid admin credentials" });
    }

    // CUSTOMER / WORKER LOGIN CHECK
    const user = await User.findOne({ email: cleanEmail, role });
    if (!user) {
      return res.status(401).json({ message: `No ${role} account found with this email` });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const token = createToken(user);
    res.json({
      message: "Login successful",
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. FORGOT PASSWORD (OTP Mailer)
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({ message: "User not found with this email" });
    }

    // 6-digit OTP Generate karein
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save OTP to DB Document
    user.resetOtp = otp;
    user.resetOtpExpire = Date.now() + 10 * 60 * 1000; // 10 Min Validity
    await user.save();

    // Mail Payload
    const mailOptions = {
      from: `"SupportFlow" <${process.env.EMAIL_USER}>`,
      to: cleanEmail,
      subject: 'SupportFlow - Password Reset OTP',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Password Reset Request</h2>
          <p>Your OTP code to reset your password is:</p>
          <h1 style="color: #4F46E5; letter-spacing: 5px;">${otp}</h1>
          <p>This code will expire in 10 minutes.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP Email sent successfully to: ${cleanEmail}`);

    res.status(200).json({ message: "OTP sent to your email successfully" });

  } catch (error) {
    console.error("❌ Forgot Password Error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
};