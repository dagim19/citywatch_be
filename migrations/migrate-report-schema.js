// migrations/migrate-report-schema.js
const mongoose = require('mongoose');
const Report = require('../src/models/Report');

require('dotenv').config();

async function migrateReports() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // 1. Set default category for documents where it's missing
    await Report.updateMany(
      { category: { $exists: false } },
      { $set: { category: 'General' } }
    );

    // 2. Populate verifiedBy and verified_at (example: set to user_id and createdAt if missing)
    await Report.updateMany(
      { verifiedBy: { $exists: false } },
      [{ $set: { verifiedBy: '$user_id', verified_at: '$createdAt' } }]
    );

    // 3. Remove deprecated fields (upvotes, downvotes, comments)
    await Report.updateMany(
      {},
      { $unset: { upvotes: '', downvotes: '', comments: '' } }
    );

    // 4. Initialize new fields (resolved, assignedTo, issueType)
    await Report.updateMany(
      {},
      { 
        $set: { 
          resolved: 'waiting', // Fix invalid default "false"
          assignedTo: null,
          issueType: null 
        } 
      }
    );

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

migrateReports();