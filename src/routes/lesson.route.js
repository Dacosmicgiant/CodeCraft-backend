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
  reorderLessons,
  togglePublishStatus,
  exportLesson,
  validateMediaUrl
} from '../controllers/lesson.controller.js';
import { protect, admin } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes (with authentication check for access control)
router.get('/', protect, getAllLessons); // GET /api/v1/lessons (default route for getting all lessons)
router.get('/all', protect, getAllLessons); // GET /api/v1/lessons/all (alternative route)

// Media validation route (admin only)
router.post('/validate-media', protect, admin, validateMediaUrl); // POST /api/v1/lessons/validate-media

// Admin-only routes (must come before /:id to avoid conflicts)
router.get('/:id/export', protect, admin, exportLesson); // GET /api/v1/lessons/:id/export
router.put('/:id/content', protect, admin, updateLessonContent); // PUT /api/v1/lessons/:id/content
router.post('/:id/duplicate', protect, admin, duplicateLesson); // POST /api/v1/lessons/:id/duplicate
router.put('/:id/toggle-publish', protect, admin, togglePublishStatus); // PUT /api/v1/lessons/:id/toggle-publish
router.put('/:id', protect, admin, updateLesson); // PUT /api/v1/lessons/:id
router.delete('/:id', protect, admin, deleteLesson); // DELETE /api/v1/lessons/:id

// This must come last to avoid conflicts with other routes
router.get('/:id', protect, getLessonById); // GET /api/v1/lessons/:id

export default router;