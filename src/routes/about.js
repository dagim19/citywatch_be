const express = require('express');
const User = require('../models/User'); // Assuming you have a User model
const router = express.Router();
const auth = require('../middleware/auth');

// get user info
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
    //let's return dummy data for now
    // res.json({
    //   name: 'User',
    //   fatherName: 'Father',
    //   email: 'test@gmail.com',
    //   phone: '1234567890',
    //   subCity: 'Test City',
    // })
    } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
    }
}
);

module.exports = router;
