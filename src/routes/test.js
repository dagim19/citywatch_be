// In a separate test route file (e.g., test.js)
const express = require('express');
const router = express.Router();
const admin = require('./firebase');

router.get('/firebase-test', async (req, res) => {
  try {
    const listUsersResult = await admin.auth().listUsers();
    res.json({ message: 'Firebase initialized correctly', users: listUsersResult.users });
  } catch (error) {
    res.status(500).json({ message: 'Firebase test failed', error });
  }
});

module.exports = router;
