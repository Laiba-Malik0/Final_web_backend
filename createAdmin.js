require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const createAdmin = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected Successfully!');

    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@supportflow.com').toLowerCase().trim();
    const rawPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // Old entries cleanup
    await User.deleteMany({ email: { $in: ['admin@gmail.com', 'admin@supportsphere.com', adminEmail] } });

    const newAdmin = new User({
      name: 'System Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin'
    });

    await newAdmin.save();

    console.log('\n==================================');
    console.log('🎉 SUCCESS! Admin Created Successfully');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${rawPassword}`);
    console.log('==================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  }
};

createAdmin();