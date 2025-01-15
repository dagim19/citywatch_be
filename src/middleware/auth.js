const jwt = require('jsonwebtoken');
const User = require("../models/User"); // Import your User model

const auth = async (req, res, next) => {
  try {
    // 1. Get the token from the request header
    const authHeader = req.header('Authorization');

    if (!authHeader) {
      return res.status(401).json({ message: 'Authorization header missing' });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Middleware token: ', token);

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // 2. Verify the token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      console.error('JWT Verification Error:', err);
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
      } else if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid token' });
      } else {
        return res.status(401).json({ message: 'Token verification failed' });
      }
    }

    console.log('Middleware decoded: ', decoded);

    // 3. Find the user based on the decoded token's ID
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // 4. Attach the user object to the request for use in other routes
    req.user = user;

    // 5. Proceed to the next middleware or route handler
    next();
  } catch (error) {
    console.error('Middleware Error:', error);
    // Catch any unexpected errors during the database query or other operations
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = auth;