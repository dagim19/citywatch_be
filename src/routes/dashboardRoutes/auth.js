const express = require('express');
const bcrypt = require('bcrypt'); // For password hashing
const router = express.Router();
const User = require('../../models/User');
const jwt = require('jsonwebtoken');

router.post('/signup', async (req, res) => {
    try {
      console.log(req.body);
      const { name, fatherName, email, phone, password, subcity, role, institution } = req.body;
  
      // Simple validation (add more as needed)
      if (!name || !email || !phone || !subcity || !password || !role || !institution) {
        return res.status(400).json({ message: 'Please fill all required fields' });
      }
  
      // Check if email or phone already exists
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ message: 'Email already exists' });
      }
  
      const phoneExists = await User.findOne({ phone });
      if (phoneExists) {
        return res.status(400).json({ message: 'phone number already exists' });
      }
  
      // Create a new user
      const user = new User({
        name,
        fatherName,
        email,
        phone,
        password,
        subcity,
        role,
        institution,
      });
  
      await user.save();
  
      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });



// Login Route
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    // Find user by phone
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;