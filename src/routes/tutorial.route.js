import express from 'express';
import {
  createTutorial,
  getTutorials,
  getTutorialById,
  updateTutorial,
  deleteTutorial
} from '../controllers/tutorial.controller.js';
import { protect, admin } from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply protect middleware to GET routes to check for authentication
// This way, admin users can see unpublished content
router.get('/', protect, getTutorials);
router.get('/:id', protect, getTutorialById);

// Admin-only routes
router.post('/', protect, admin, createTutorial);
router.put('/:id', protect, admin, updateTutorial);
router.delete('/:id', protect, admin, deleteTutorial);

export default router;