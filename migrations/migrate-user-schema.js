// migrations/migrate-user-schema.js
const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config();

async function migrateUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // 1. Rename subcity to subCity
    await User.updateMany(
      {},
      { $rename: { "subcity": "subCity" } },
      { multi: true }
    );

    // 2. Add new fields with default values
    await User.updateMany(
      {},
      {
        $set: {
          institution: null,
          currentLocation: null,
          maintainerAvailable: false
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