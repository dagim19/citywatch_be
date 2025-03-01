// migrations/migrate-user-schema.js
const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config();

async function migrateUsers() {
  try {
    await mongoose.connect("mongodb+srv://dagim:1HFtVkWxPzxebS7k@cluster0.mshyo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");


    // 2. Add new fields with default values
    await User.updateMany(
      {},
      {
        $set: {
          // institution: null,
          // currentLocation: null,
          // maintainerAvailable: false
          reportsSupported: []
        }
      },
      { multi: true }
    );

    console.log('User migration completed successfully');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

migrateUsers();