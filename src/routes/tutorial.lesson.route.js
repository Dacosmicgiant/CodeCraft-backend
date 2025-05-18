import express from 'express';
import {
  createLesson,
  getLessonsByTutorial
} from '../controllers/lesson.controller.js';
import { protect, admin } from '../middleware/auth.middleware.js';

const router = express.Router({ mergeParams: true });

// Public routes
router.get('/', getLessonsByTutorial);

// Admin routes
router.post('/', protect, admin, createLesson);

export default router;