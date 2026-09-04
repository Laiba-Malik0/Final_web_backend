const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Mongo URI Missing Check
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing in environment variables');
    }

    // Re-use existing connection (Serverless / Vercel Optimization)
    if (mongoose.connection.readyState >= 1) {
      return;
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // Quick failover
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    // Original error pass karein taakay exact issue trace ho sakay
    throw error;
  }
};

module.exports = connectDB;