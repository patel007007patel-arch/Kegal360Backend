import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import getCalendar from '../controllers/cycle.controller/calendar.controller.js';
import getEnhancedCalendar from '../controllers/cycle.controller/calendarEnhanced.controller.js';
import getHomeData from '../controllers/cycle.controller/home.controller.js';

const router = express.Router();

router.use(authenticate);

// Home data with cycle calculations
router.get('/home', getHomeData);

// Enhanced calendar with phase calculations
router.get('/calendar/enhanced', getEnhancedCalendar);

// Original calendar (backward compatible)
router.get('/calendar', getCalendar);

export default router;
