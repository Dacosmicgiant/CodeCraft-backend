import express from 'express';
import {
  createTutorial,
  getTutorials,
  getTutorialById,
  updateTutorial,
  deleteTutorial
} from '../controllers/tutorial.controller.js';
import { protect, admin, optionalAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// PUBLIC routes with optional auth - allows browsing without login
// Admin users will still see unpublished content due to controller logic
router.get('/', optionalAuth, getTutorials);
router.get('/:id', optionalAuth, getTutorialById);

// Admin-only routes
router.post('/', protect, admin, createTutorial);
router.put('/:id', protect, admin, updateTutorial);
router.delete('/:id', protect, admin, deleteTutorial);

export default router;