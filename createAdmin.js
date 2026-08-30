// createAdmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// User Schema Direct Reference (Path issue se bachne ke liye)
const User = require('./models/User');

const createAdmin = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected Successfully!');

    // 1. Check if Admin Email Already Exists
    const adminEmail = 'admin@gmail.com';
    const existingUser = await User.findOne({ email: adminEmail });

    if (existingUser) {
      console.log(`⚠️ User with email ${adminEmail} already exists!`);
      
      // Agar user pehle se hai lekin role admin nahi hai, to update kardo
      if (existingUser.role !== 'admin') {
        existingUser.role = 'admin';
        await existingUser.save();
        console.log('🔄 User role updated to ADMIN!');
      }
      
      process.exit(0);
    }

    // 2. Hash Password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // 3. Create Admin Object
    const newAdmin = new User({
      name: 'System Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin'
    });

    // 4. Save to Database
    await newAdmin.save();

    console.log('\n==================================');
    console.log('🎉 SUCCESS! Admin Created Successfully');
    console.log(`Email: ${adminEmail}`);
    console.log('Password: admin123');
    console.log('==================================\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  }
};

createAdmin();