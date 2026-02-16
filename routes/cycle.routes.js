import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import getCalendar from '../controllers/cycle.controller/calendar.controller.js';
import getEnhancedCalendar from '../controllers/cycle.controller/calendarEnhanced.controller.js';
import getHomeData from '../controllers/cycle.controller/home.controller.js';
import { getCycleSettings, updateCycleSettings, getCycleSwitchHistory } from '../controllers/cycle.controller/cycleSettings.controller.js';

const router = express.Router();

router.use(authenticate);

// Home data with cycle calculations
router.get('/home', getHomeData);

// Edit Mode: get/update cycle settings (Regular / Irregular / Absent)
router.get('/settings', getCycleSettings);
router.put('/settings', updateCycleSettings);

// Cycle switch history (for sync: previous cycle type/settings each time user switched)
router.get('/switch-history', getCycleSwitchHistory);

// Enhanced calendar with phase calculations
router.get('/calendar/enhanced', getEnhancedCalendar);

// Original calendar (backward compatible)
router.get('/calendar', getCalendar);

export default router;
