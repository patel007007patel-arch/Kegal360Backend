import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  startSession,
  completeStep,
  completeSession,
  getSessionProgress,
  getAllUserProgress
} from '../controllers/progress.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post('/start', startSession);
router.post('/step/complete', completeStep);
router.post('/complete', completeSession);
router.get('/session/:sessionId', getSessionProgress);
router.get('/all', getAllUserProgress);

export default router;
