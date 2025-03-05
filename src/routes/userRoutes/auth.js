const express = require('express');
const bcrypt = require('bcrypt'); // For password hashing
const router = express.Router();
const User = require('../../models/User');
const jwt = require('jsonwebtoken');
// const admin = require('./firebase');
const { sendOTPEmail } = require('../emailService'); // Import the sendOTPEmail function
const { sendOTPSMS } = require('../smsService');
// Forgot Password Route
router.post('/forgot-password', async (req, res) => {
  const { email, phone } = req.body;

  if (!email && !phone) {
    return res.status(400).json({ message: 'Email or phone is required' });
  }

  let user = null;
  if (email) {
    user = await User.findOne({ email });
  } else if (phone) {
    user = await User.findOne({ phone });
  }

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Generate a 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000);
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 10); // OTP expires in 10 minutes

  // Save OTP in user document
  user.resetOtp = otp;
  user.resetOtpExpiry = expiry;
  await user.save();

  // Send OTP via email or SMS
  try {
    if (email) {
      const emailSent = await sendOTPEmail(email, otp); // Use the imported function
      if (!emailSent) {
        return res.status(500).json({ message: 'Error sending OTP via email' });
      }
    } else if (phone) {
      const smsSent = await sendOTPSMS(phone, otp); // Use the sendOTPSMS function
      if (!smsSent) {
        return res.status(500).json({ message: 'Error sending OTP via SMS' });
      }
    }

    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error sending OTP', error });
  }
});
// Verify OTP Endpoint
router.post('/verify-otp', async (req, res) => {
  const { email, phone, otp } = req.body;

  let user = null;
  if (email) {
    user = await User.findOne({ email });
  } else if (phone) {
    user = await User.findOne({ phone });
  }

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Compare the provided OTP with the stored OTP and check expiry
  if (user.resetOtp !== parseInt(otp) || new Date() > new Date(user.resetOtpExpiry)) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  // Optionally, mark OTP as verified (you can also clear it here or create a temporary token)
  user.resetOtpVerified = true;
  await user.save();

  return res.json({ message: 'OTP verified successfully' });
});



// Verify OTP and reset password
router.post('/reset-password', async (req, res) => {
  const { email, phone, otp, newPassword } = req.body;

  let user = null;
  if (email) {
    user = await User.findOne({ email });
  } else if (phone) {
    user = await User.findOne({ phone });
  }

  if (!user || user.resetOtp !== parseInt(otp) || new Date() > new Date(user.resetOtpExpiry)) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  // Hash new password
  const salt = await bcrypt.genSalt(10);
  user.password = newPassword;

  // Clear OTP fields
  user.resetOtp = null;
  user.resetOtpExpiry = null;
  await user.save();

  res.json({ message: 'Password reset successful' });
});

// Signup Route
router.post('/signup', async (req, res) => {
  try {
    console.log(req.body);
    const { name, fatherName, email, phone, password, subcity } = req.body;

    // Simple validation (add more as needed)
    if (!name || !email || !phone || !subcity || !password) {
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
      subcity, // Use lowercase consistently
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
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;