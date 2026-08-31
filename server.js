const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const User = require('./models/User');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Global DB Connection & Admin Auto-seed Middleware for Serverless
let isDbConnected = false;

const initDB = async () => {
  if (isDbConnected) return;
  try {
    await connectDB();
    isDbConnected = true;
    
    // Seed Admin automatically
    const adminEmail = 'admin@supportflow.com';
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        name: 'System Admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin'
      });
      console.log('✅ Default Admin Verified & Ready');
    }
  } catch (err) {
    console.error('❌ Admin auto-seed / DB error:', err.message);
  }
};

// Ensure DB connects before processing any request
app.use(async (req, res, next) => {
  await initDB();
  next();
});

// Root Health Check Route (Fixes 404 / Cannot GET /)
app.get('/', (req, res) => {
  res.send('SupportSphere Backend Server is Running Successfully!');
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tickets', require('./routes/ticketRoutes'));

// Local development listener
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`SupportSphere Server running on port ${PORT}`));
}

// Export app for Vercel Serverless Functions
module.exports = app;