// src/routes/lesson.route.js
import express from 'express';
import {
  createLesson,
  getAllLessons,
  getLessonsByTutorial,
  getLessonById,
  updateLesson,
  deleteLesson,
  updateLessonContent,
  duplicateLesson,
  reorderLessons
} from '../controllers/lesson.controller.js';
import { protect, admin } from '../middleware/auth.middleware.js';

const router = express.Router();

// Admin route to get all lessons across all tutorials
router.get('/', protect, admin, getAllLessons);

// Public routes (with authentication check for access control)
router.get('/:id', protect, getLessonById);

// Admin-only routes
router.put('/:id', protect, admin, updateLesson);
router.delete('/:id', protect, admin, deleteLesson);
router.put('/:id/content', protect, admin, updateLessonContent);
router.post('/:id/duplicate', protect, admin, duplicateLesson);

export default router;