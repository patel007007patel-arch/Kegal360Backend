import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getSessionsByPhase,
  getSessionDetails,
  getAllSessions
} from '../controllers/session.controller.js';
 import {
  getStepsBySession,
  getStepById
} from '../controllers/step.controller.js';

const router = express.Router();

// Public routes (no auth required for browsing)
router.get('/phase', getSessionsByPhase);
router.get('/all', getAllSessions);

// Step routes (must come before /:id to avoid route conflicts)
router.get('/steps/:stepId', getStepById);
router.get('/:sessionId/steps', getStepsBySession);

// Session detail route (must be last to avoid conflicts)
router.get('/:id', getSessionDetails);

// Protected routes
router.use(authenticate);

export default router;
