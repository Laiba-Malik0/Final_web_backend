const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Re-use existing connection in serverless environment
    if (mongoose.connection.readyState >= 1) {
      return;
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout fast handle karne ke liye
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    // Serverless me process.exit(1) NAHIN karna, aksar is se Vercel crash ho jata hai
    throw new Error('Database connection failed');
  }
};

module.exports = connectDB;