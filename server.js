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

// 1. Configure CORS for REST APIs
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

app.use((req, res, next) => {
  req.io = io;
  next();
});

// 3. Global DB Connection & Admin Auto-seed Setup
let isDbConnected = false;

const initDB = async () => {
  if (isDbConnected) return;
  try {
    await connectDB();
    isDbConnected = true;
    console.log('✅ MongoDB Connected Successfully!');
    
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

// Ensure DB connects on every Vercel request
app.use(async (req, res, next) => {
  await initDB();
  next();
});

// 4. Root Health Check Route
app.get('/', (req, res) => {
  res.send('SupportSphere Backend Server is Running Successfully!');
});

// 5. Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tickets', require('./routes/ticketRoutes'));

// 6. Local development listener with auto DB connection
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  server.listen(PORT, async () => {
    console.log(`SupportSphere Server running on port ${PORT}`);
    await initDB(); // Local start hotey hi DB connect karega
  });
}

// Export app for Vercel
module.exports = app;