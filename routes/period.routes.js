import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { addPeriod, removePeriod } from '../controllers/period.controller.js';

const router = express.Router();

router.use(authenticate);

/** Add period day — only updates User (lastPeriodStart/End/periodLength). No logs. */
router.post('/add', addPeriod);

/** Remove period day — only updates User. No logs. */
router.post('/remove', removePeriod);

export default router;
