const mongoose = require('mongoose');

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing in environment variables');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: true, // Buffer commands true rakhen taake initial connection setup ke waqt crash na ho
      maxPoolSize: 10,       // Serverless environments (Vercel) ke liye 10 ideal hai, 50 se DB pool exhaust hota hai
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(process.env.MONGO_URI, opts).then((mongooseInstance) => {
      console.log(`MongoDB Connected: ${mongooseInstance.connection.host}`);
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error(`Database Connection Error: ${error.message}`);
    throw error;
  }

  return cached.conn;
};

module.exports = connectDB;