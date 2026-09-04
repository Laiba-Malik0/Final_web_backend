const User = require('../models/User');

// 1. Create Worker (Admin Only)
exports.createWorker = async (req, res) => {
  try {
    const { name, email, password, department, phone } = req.body;

    // Required Field Check
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if worker already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ error: 'User/Worker with this email already exists' });
    }

    const newWorker = new User({
      name,
      email: email.toLowerCase().trim(),
      password, // Password hashed via pre-save hook in Schema
      role: 'worker',
      department: department || 'General',
      phone: phone || ''
    });

    await newWorker.save();

    // Password remove karke return karein
    const workerResponse = newWorker.toObject();
    delete workerResponse.password;

    res.status(201).json({ 
      message: 'Worker created successfully', 
      worker: workerResponse 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. Get All Workers (For Admin & System Queries)
exports.getWorkers = async (req, res) => {
  try {
    const workers = await User.find({ role: 'worker' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json(workers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};