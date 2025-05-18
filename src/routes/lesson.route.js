import express from 'express';
import {
  createLesson,
  getLessonsByTutorial,
  getLessonById,
  updateLesson,
  deleteLesson,
  updateLessonContent
} from '../controllers/lesson.controller.js';
import { protect, admin } from '../middleware/auth.middleware.js';

const router = express.Router();

// Add protect middleware to GET route to check for authentication
router.get('/:id', protect, getLessonById);

// Admin routes
router.put('/:id', protect, admin, updateLesson);
router.delete('/:id', protect, admin, deleteLesson);
router.put('/:id/content', protect, admin, updateLessonContent);

// Export router
export default router;