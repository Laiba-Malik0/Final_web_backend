const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const User = require('./models/User');

dotenv.config();

const app = express();

// 1. CORS Configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// 2. Setup HTTP Server & Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

io.on('connection', (socket) => {
  console.log('⚡ Socket client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('🔥 Socket client disconnected:', socket.id);
  });
});

// Attach Socket instance to Request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// 3. Database Connection & Admin Auto-Seed
let dbPromise = null;

const initDB = async () => {
  if (!dbPromise) {
    dbPromise = (async () => {
      await connectDB();
      console.log('✅ MongoDB Connected Successfully!');

      // Seed Admin automatically if not present
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@supportflow.com';
      const existingAdmin = await User.findOne({ email: adminEmail });

      if (!existingAdmin) {
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        await User.create({
          name: 'System Admin',
          email: adminEmail,
          password: hashedPassword,
          role: 'admin'
        });
        console.log('✅ Default Admin Verified & Ready');
      }
    })();
  }
  return dbPromise;
};

// Middleware for serverless environments (e.g. Vercel) to guarantee DB connection
app.use(async (req, res, next) => {
  try {
    await initDB();
    next();
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// 4. Health Check Route
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'SupportSphere Backend Server is Running!' });
});

// 5. API Routes Setup
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tickets', require('./routes/ticketRoutes'));

try {
  const adminRoutes = require('./routes/adminRoutes');
  app.use('/api/admin', adminRoutes);
} catch (err) {
  console.warn('⚠️ Warning: Admin routes file missing or path incorrect:', err.message);
}

// 6. Local Server Listener (For non-serverless like Render/Railway/Local)
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  server.listen(PORT, () => {
    console.log(`🚀 SupportSphere Server running on port ${PORT}`);
  });
}

module.exports = app;