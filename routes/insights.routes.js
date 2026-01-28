import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import getCycleInsights from '../controllers/insights.controller/cycleInsights.controller.js';
import { getSessionInsights } from '../controllers/insights.controller/sessionInsights.controller.js';
import exportCycleData from '../controllers/insights.controller/export.controller.js';

const router = express.Router();

router.use(authenticate);

// Cycle Insights (single source of truth)
// Main endpoint for the app/UI
router.get('/cycle', getCycleInsights);

// Get session insights (unified for all session types)
router.get('/sessions', getSessionInsights);

// Export cycle data
router.get('/cycle/export', exportCycleData);

export default router;
