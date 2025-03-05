const express = require('express');
const User = require('../../models/User');
const router = express.Router();
const auth = require('../../middleware/auth');

// get user info
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
    } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
    }
}
);

module.exports = router;
