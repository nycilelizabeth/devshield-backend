// ============================================
// middleware/auth.js — JWT Authentication Middleware
//
// This function runs BEFORE any protected route.
// It checks if the user sent a valid login token.
// If yes → allow access. If no → reject with 401 error.
//
// Think of it as a security guard at a door.
// ============================================

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // JWT tokens are sent in the request header like:
  // Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6...
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]; // Get just the token part
  }

  // No token found — reject the request
  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: 'Not authorized. Please log in first.' 
    });
  }

  try {
    // Verify the token using our secret key
    // If token is fake or expired, this will throw an error
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user from the token's payload (id was stored when we created the token)
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'User no longer exists.' 
      });
    }

    // ✅ Token is valid — pass control to the next function (the actual route)
    next();

  } catch (error) {
    return res.status(401).json({ 
      success: false,
      message: 'Invalid or expired token. Please log in again.' 
    });
  }
};

module.exports = { protect };
