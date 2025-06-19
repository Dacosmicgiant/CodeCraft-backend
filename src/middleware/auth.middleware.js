// src/middleware/auth.middleware.js - Compatible with current backend
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

// @desc    Protect routes - Authentication middleware
// @access  Private routes
export const protect = async (req, res, next) => {
  let token;

  try {
    // Check for token in cookies first (your current setup), then headers
    if (req.cookies.token) {
      token = req.cookies.token;
      console.log('🍪 Found token in cookies');
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('📋 Found token in headers');
    }

    // Make sure token exists
    if (!token) {
      console.log('❌ No token found in cookies or headers');
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, no token provided' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔓 Token decoded successfully:', decoded.id);

    // Find user by id from token (excluding password)
    const user = await User.findById(decoded.id).select('-password');
    
    console.log('👤 User lookup result:', user ? 'User found' : 'User not found');

    // Check if user still exists
    if (!user) {
      console.log('❌ User not found for ID:', decoded.id);
      return res.status(401).json({ 
        success: false,
        message: 'User not found, token invalid' 
      });
    }

    // Add user to request object
    req.user = user;
    console.log('✅ User authenticated:', user.username || user.email);
    next();

  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);
    
    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, invalid token' 
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, token expired' 
      });
    } else {
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, token failed' 
      });
    }
  }
};

// @desc    Admin middleware - Check if user is admin
// @access  Private routes (Admin only)
export const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ 
      success: false,
      message: 'Not authorized as an admin' 
    });
  }
};

// @desc    Optional auth middleware - Don't fail if no token
// @access  Public routes that benefit from user context
export const optionalAuth = async (req, res, next) => {
  let token;

  try {
    // Check for token in cookies or headers
    if (req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // If no token, continue without setting req.user
    if (!token) {
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by id (excluding password)
    const user = await User.findById(decoded.id).select('-password');

    // If user exists, add to request
    if (user) {
      req.user = user;
    }

    next();

  } catch (error) {
    // If token is invalid, continue without setting req.user
    console.log('Optional auth failed:', error.message);
    next();
  }
};

// @desc    Check if user owns resource or is admin
// @access  Private routes
export const ownerOrAdmin = (req, res, next) => {
  if (req.user && (req.user._id.toString() === req.params.userId || req.user.role === 'admin')) {
    next();
  } else {
    return res.status(403).json({ 
      success: false,
      message: 'Not authorized to access this resource' 
    });
  }
};