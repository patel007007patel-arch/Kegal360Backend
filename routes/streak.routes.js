import express from 'express';
import { addStreak, getStreaks } from '../controllers/streak.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Require authentication for all streak routes
router.use(authenticate);

// Get all streaks
router.get('/', getStreaks);

// Add/Update today's streak
router.post('/', addStreak);

export default router;
