const mongoose = require('mongoose');

/**
 * Database connection configuration
 * Connects to MongoDB with optimized settings
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Connection optimizations
      maxPoolSize: 10,          // Maximum number of connections
      serverSelectionTimeoutMS: 5000,  // Keep trying for 5 seconds
      socketTimeoutMS: 45000,   // Close sockets after 45 seconds
      bufferCommands: false,    // Disable mongoose buffering
      bufferMaxEntries: 0       // Disable mongoose buffering
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);

    // Connection event handlers
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🛑 MongoDB connection closed due to application termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('🔧 Please check your MONGODB_URI in .env file');
    process.exit(1);
  }
};

module.exports = connectDB;
