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

// Public routes
router.get('/', getTutorials);
router.get('/:id', getTutorialById);

// Admin routes
router.post('/', protect, admin, createTutorial);
router.put('/:id', protect, admin, updateTutorial);
router.delete('/:id', protect, admin, deleteTutorial);

export default router;