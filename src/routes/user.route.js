import express from 'express';
import {
  getUserProfile,
  updateUserProfile,
  getUserProgress,
  getUserBookmarks
} from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// Profile routes
router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);

// Progress and bookmarks routes
router.get('/progress', getUserProgress);
router.get('/bookmarks', getUserBookmarks);

export default router;