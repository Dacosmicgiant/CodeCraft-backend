// src/routes/lesson.route.js
import express from 'express';
import {
  createLesson,
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

// Public routes (with authentication check for access control)
router.get('/:id', protect, getLessonById);

// Admin-only routes
router.put('/:id', protect, admin, updateLesson);
router.delete('/:id', protect, admin, deleteLesson);
router.put('/:id/content', protect, admin, updateLessonContent);
router.post('/:id/duplicate', protect, admin, duplicateLesson);

export default router;