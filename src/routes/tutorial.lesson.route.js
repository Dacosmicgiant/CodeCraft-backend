// src/routes/tutorial.lesson.route.js
import express from 'express';
import {
  createLesson,
  getLessonsByTutorial,
  reorderLessons
} from '../controllers/lesson.controller.js';
import { protect, admin } from '../middleware/auth.middleware.js';

const router = express.Router({ mergeParams: true });

// Public routes (with authentication check for access control)
router.get('/', protect, getLessonsByTutorial);

// Admin-only routes
router.post('/', protect, admin, createLesson);
router.put('/reorder', protect, admin, reorderLessons);

export default router;