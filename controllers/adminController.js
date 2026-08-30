const User = require('../models/User'); // Assuming User model has role 'worker'

// 1. Create Worker (Admin Only)
exports.createWorker = async (req, res) => {
  try {
    const { name, email, password, department, phone } = req.body;

    // Check if worker already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User/Worker with this email already exists' });
    }

    const newWorker = new User({
      name,
      email,
      password, // Password hashed via pre-save hook in Schema
      role: 'worker', // Set role as worker
      department
    });

    await newWorker.save();
    res.status(201).json({ message: 'Worker created successfully', worker: newWorker });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. Get All Workers (For Admin & Customer Dropdown)
exports.getWorkers = async (req, res) => {
  try {
    const workers = await User.find({ role: 'worker' }).select('-password');
    res.status(200).json(workers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};