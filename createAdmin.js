require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const createAdmin = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected Successfully!');

    const adminEmail = 'admin@supportflow.com';
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Old gmail wala email agar database me hai to clean up karke naya supportflow admin banayega
    await User.deleteMany({ email: { $in: ['admin@gmail.com', 'admin@supportflow.com'] } });

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
    console.log('Password: admin123');
    console.log('==================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  }
};

createAdmin();