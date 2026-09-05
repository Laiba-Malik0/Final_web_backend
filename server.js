const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const User = require('./models/User');

dotenv.config();

const app = express();

// 1. Unified CORS Configuration (Supports Production & Local)
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://final-web-project-six.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Apply CORS globally and handle Preflight requests explicitly
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());

// 2. Setup HTTP Server & Socket.io
const server = http.createServer(app);
let io;

if (process.env.NODE_ENV !== 'production') {
  io = new Server(server, {
    cors: corsOptions
  });

  io.on('connection', (socket) => {
    console.log('⚡ Socket client connected:', socket.id);
    socket.on('disconnect', () => {
      console.log('🔥 Socket client disconnected:', socket.id);
    });
  });
}

// Attach Safe Socket Instance to Request (Prevents crashes in serverless)
app.use((req, res, next) => {
  req.io = io || { emit: () => {} };
  next();
});

// 3. Database Connection & Admin Auto-seed Setup
let isConnected = false;

const initDB = async () => {
  if (isConnected) return;

  try {
    await connectDB();
    isConnected = true;
    console.log('✅ MongoDB Connected Successfully!');

    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@supportflow.com').toLowerCase().trim();
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      await User.create({
        name: 'System Admin',
        email: adminEmail,
        password: adminPassword,
        role: 'admin'
      });
      console.log('✅ Default Admin Verified & Ready');
    }
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  }
};

// Middleware for serverless requests (Vercel)
app.use(async (req, res, next) => {
  await initDB();
  next();
});

// 4. Root Health Check Route
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'SupportSphere Backend Server is Running Successfully!' });
});

// 5. Routes Setup
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tickets', require('./routes/ticketRoutes'));

try {
  const adminRoutes = require('./routes/adminRoutes');
  app.use('/api/admin', adminRoutes);
} catch (err) {
  console.warn('⚠️ Warning: Admin routes file missing or path incorrect:', err.message);
}

// 6. Local Server Listener
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  server.listen(PORT, async () => {
    await initDB();
    console.log(`🚀 SupportSphere Server running on port ${PORT}`);
  });
}

// Export app for Vercel deployment
module.exports = app;