import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import Log from '../models/Log.model.js';
import Cycle from '../models/Cycle.model.js';
import YogaSession from '../models/YogaSession.model.js';
import MeditationSession from '../models/MeditationSession.model.js';
import getCycleInsights from '../controllers/insights.controller/cycleInsights.controller.js';
import exportCycleData from '../controllers/insights.controller/export.controller.js';

const router = express.Router();

router.use(authenticate);

// Get cycle insights (detailed)
router.get('/cycle/detailed', getCycleInsights);

// Get cycle insights
router.get('/cycle', async (req, res) => {
  try {
    const userId = req.user._id;
    const { startDate, endDate } = req.query;

    let cycleQuery = { user: userId };
    let logQuery = { user: userId };

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      cycleQuery.startDate = { $gte: start, $lte: end };
      logQuery.date = { $gte: start, $lte: end };
    }

    const cycles = await Cycle.find(cycleQuery).sort({ startDate: 1 });
    const logs = await Log.find(logQuery);

    // Calculate statistics
    const cycleLengths = cycles.map(c => c.cycleLength);
    const periodLengths = cycles.map(c => c.periodLength).filter(Boolean);

    const stats = {
      averageCycleLength: cycleLengths.length > 0
        ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length)
        : null,
      shortestCycle: cycleLengths.length > 0 ? Math.min(...cycleLengths) : null,
      longestCycle: cycleLengths.length > 0 ? Math.max(...cycleLengths) : null,
      averagePeriodLength: periodLengths.length > 0
        ? Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length)
        : null,
      periodRange: periodLengths.length > 0
        ? `${Math.min(...periodLengths)}-${Math.max(...periodLengths)} days`
        : null
    };

    // Most common logs per phase
    const phaseLogs = {};
    logs.forEach(log => {
      if (log.phase && log.mood) {
        if (!phaseLogs[log.phase]) {
          phaseLogs[log.phase] = { moods: [] };
        }
        phaseLogs[log.phase].moods.push(...log.mood);
      }
    });

    const mostCommonLogs = {};
    Object.keys(phaseLogs).forEach(phase => {
      const moodCounts = {};
      phaseLogs[phase].moods.forEach(mood => {
        moodCounts[mood] = (moodCounts[mood] || 0) + 1;
      });
      mostCommonLogs[phase] = Object.keys(moodCounts)
        .sort((a, b) => moodCounts[b] - moodCounts[a])
        .slice(0, 3);
    });

    res.json({
      success: true,
      data: {
        stats,
        cycles,
        mostCommonLogs,
        periodRange: stats.periodRange
      }
    });
  } catch (error) {
    console.error('Get cycle insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cycle insights',
      error: error.message
    });
  }
});

// Get yoga insights
router.get('/yoga', async (req, res) => {
  try {
    const userId = req.user._id;
    const { month, year } = req.query;

    let query = { user: userId };
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      query.date = { $gte: start, $lte: end };
    }

    const sessions = await YogaSession.find(query);
    const totalSessions = sessions.length;
    const totalMinutes = Math.round(sessions.reduce((sum, s) => sum + s.duration, 0) / 60);
    const completedSessions = sessions.filter(s => s.completed).length;

    // Calculate streak
    const sortedSessions = sessions.sort((a, b) => b.date - a.date);
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const session of sortedSessions) {
      const sessionDate = new Date(session.date);
      sessionDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((currentDate - sessionDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays === streak) {
        streak++;
        currentDate = sessionDate;
      } else {
        break;
      }
    }

    res.json({
      success: true,
      data: {
        totalSessions,
        totalMinutes,
        completedSessions,
        streak,
        sessions: sessions.slice(0, 30) // Last 30 sessions
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching yoga insights',
      error: error.message
    });
  }
});

// Export cycle data
router.get('/cycle/export', exportCycleData);

export default router;
