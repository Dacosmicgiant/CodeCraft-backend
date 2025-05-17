// src/controllers/user.controller.js
import User from '../models/user.model.js';

// @desc    Get user profile
// @route   GET /api/v1/users/profile
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    // Get user from auth middleware (excludes password)
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      bio: user.bio || '',
      location: user.location || '',
      websiteUrl: user.websiteUrl || '',
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/v1/users/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Fields that can be updated
    const { username, email, bio, location, websiteUrl, password } = req.body;
    
    // Check if username already exists (if being changed)
    if (username && username !== user.username) {
      const usernameExists = await User.findOne({ username });
      if (usernameExists) {
        return res.status(400).json({ message: 'Username already taken' });
      }
      user.username = username;
    }
    
    // Check if email already exists (if being changed)
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      user.email = email;
    }
    
    // Update optional fields if provided
    if (bio !== undefined) user.bio = bio;
    if (location !== undefined) user.location = location;
    if (websiteUrl !== undefined) user.websiteUrl = websiteUrl;
    
    // Update password if provided
    if (password) {
      user.password = password; // Will be hashed by pre-save hook
    }
    
    const updatedUser = await user.save();
    
    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role,
      bio: updatedUser.bio || '',
      location: updatedUser.location || '',
      websiteUrl: updatedUser.websiteUrl || '',
      createdAt: updatedUser.createdAt
    });
  } catch (error) {
    console.error('Error in updateUserProfile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get user progress
// @route   GET /api/v1/users/progress
// @access  Private
export const getUserProgress = async (req, res) => {
  try {
    // Since Tutorial model might not exist yet, safely handle this
    const user = await User.findById(req.user._id).select('progress');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return empty array if no progress or populate would fail
    // In a real app, you would populate this with 'progress.tutorial'
    res.json(user.progress || []);
  } catch (error) {
    console.error('Error in getUserProgress:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get user bookmarks
// @route   GET /api/v1/users/bookmarks
// @access  Private
export const getUserBookmarks = async (req, res) => {
  try {
    // Since Tutorial model might not exist yet, safely handle this
    const user = await User.findById(req.user._id).select('bookmarks');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return empty array if no bookmarks or populate would fail
    // In a real app, you would populate this with 'bookmarks'
    res.json(user.bookmarks || []);
  } catch (error) {
    console.error('Error in getUserBookmarks:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};