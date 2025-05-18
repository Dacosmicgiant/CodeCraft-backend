import express from 'express';
import {
  createTechnology,
  getTechnologies,
  getTechnologyById,
  updateTechnology,
  deleteTechnology
} from '../controllers/technology.controller.js';
import { protect, admin } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.get('/', getTechnologies);
router.get('/:id', getTechnologyById);

// Admin routes
router.post('/', protect, admin, createTechnology);
router.put('/:id', protect, admin, updateTechnology);
router.delete('/:id', protect, admin, deleteTechnology);

export default router;