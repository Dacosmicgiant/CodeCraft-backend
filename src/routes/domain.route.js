import express from 'express';
import {
  createDomain,
  getDomains,
  getDomainById,
  updateDomain,
  deleteDomain
} from '../controllers/domain.controller.js';
import { protect, admin } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.get('/', getDomains);
router.get('/:id', getDomainById);

// Admin routes
router.post('/', protect, admin, createDomain);
router.put('/:id', protect, admin, updateDomain);
router.delete('/:id', protect, admin, deleteDomain);

export default router;