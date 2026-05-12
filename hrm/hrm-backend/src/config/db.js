const mongoose = require('mongoose');

const connectDB = async () => {
   console.log('URI:', process.env.MONGODB_URI);
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'hrms',
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
