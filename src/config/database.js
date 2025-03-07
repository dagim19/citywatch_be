const mongoose = require('mongoose');
require('dotenv').config();

const connectToAtlas = async () => {
  try {
    const connectionLink = process.env.MONGODB_URI;
    await mongoose.connect(connectionLink);
  } catch (err) {
    // pass the error to the caller
    throw err
  }
}

const connectDB = async () => {
  try {
    // await mongoose.connect(process.env.MONGODB_URI);
    await connectToAtlas();
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error(err.message);
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;