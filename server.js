const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Message = require('./models/Message');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PATCH'] }
});

app.use(cors());
app.use(express.json());

// Attach io to request object
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Database connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected Successfully'))
  .catch(err => console.error('MongoDB Error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/stats', require('./routes/stats'));

// Route check for Admin
try {
  app.use('/api/admin', require('./routes/admin'));
} catch (e) {
  console.log('Admin route missing or not loaded yet.');
}

// Direct Route to Create Admin Accounts (Matches UI Pre-filled Email)
app.get('/api/auth/create-admin', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // 1. Create supportflow email (UI pre-filled match)
    let admin1 = await User.findOne({ email: 'admin@supportflow.com' });
    if (!admin1) {
      admin1 = new User({
        name: 'System Admin',
        email: 'admin@supportflow.com',
        password: hashedPassword,
        role: 'admin'
      });
      await admin1.save();
    }

    // 2. Create gmail email (Backup)
    let admin2 = await User.findOne({ email: 'admin@gmail.com' });
    if (!admin2) {
      admin2 = new User({
        name: 'System Admin',
        email: 'admin@gmail.com',
        password: hashedPassword,
        role: 'admin'
      });
      await admin2.save();
    }

    return res.status(200).json({
      message: '🎉 Both Admin Accounts Successfully Created & Synced!',
      credentials: [
        { email: 'admin@supportflow.com', password: 'admin123' },
        { email: 'admin@gmail.com', password: 'admin123' }
      ]
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Socket.IO Real-time Communication Logic
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join_room', (ticketId) => {
    socket.join(ticketId);
  });

  socket.on('send_message', async ({ ticketId, senderId, senderRole, message }) => {
    try {
      const newMsg = new Message({ ticketId, senderId, senderRole, message });
      await newMsg.save();
      const populatedMsg = await Message.findById(newMsg._id).populate('senderId', 'name role');
      
      io.to(ticketId).emit('receive_message', populatedMsg);
    } catch (err) {
      console.error('Socket message error:', err);
    }
  });

  socket.on('typing', ({ ticketId, userName }) => {
    socket.to(ticketId).emit('user_typing', userName);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));