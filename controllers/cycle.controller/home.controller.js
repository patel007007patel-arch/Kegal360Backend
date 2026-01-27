import User from '../../models/User.model.js';
import Log from '../../models/Log.model.js';
import { calculateCyclePredictions, generateCalendarData } from '../../services/cycleCalculation.service.js';

export const getHomeData = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If user doesn't track cycle, return wellness mode
    if (!user.trackCycle || user.cycleType === 'absent') {
      // Get yoga/meditation stats for wellness mode
      const YogaSession = (await import('../../models/YogaSession.model.js')).default;
      const MeditationSession = (await import('../../models/MeditationSession.model.js')).default;

      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - 7);

      const yogaSessions = await YogaSession.countDocuments({
        user: userId,
        date: { $gte: weekStart }
      });

      const meditationSessions = await MeditationSession.countDocuments({
        user: userId,
        date: { $gte: weekStart }
      });

      const totalSessions = yogaSessions + meditationSessions;
      const activeDays = new Set();
      
      const allSessions = await YogaSession.find({
        user: userId,
        date: { $gte: weekStart }
      });
      
      allSessions.forEach(session => {
        const date = new Date(session.date).toDateString();
        activeDays.add(date);
      });

      return res.json({
        success: true,
        data: {
          mode: 'wellness',
          phaseName: 'Wellness Mode',
          phase: 'wellness',
          wellnessStats: {
            yogaSessions: yogaSessions,
            meditationSessions: meditationSessions,
            totalSessions: totalSessions,
            activeDays: activeDays.size,
            restDays: 7 - activeDays.size
          }
        }
      });
    }

    // Calculate cycle predictions based on onboarding answers
    const predictions = calculateCyclePredictions(user);

    // Get today's log if exists
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayLog = await Log.findOne({
      user: userId,
      date: {
        $gte: today,
        $lt: tomorrow
      }
    });

    // Format response based on cycle type
    let homeData;

    if (user.cycleType === 'irregular') {
      // Irregular mode - show different info
      const lastPeriod = user.lastPeriodStart 
        ? Math.floor((new Date() - new Date(user.lastPeriodStart)) / (1000 * 60 * 60 * 24))
        : null;

      homeData = {
        mode: 'irregular',
        phaseName: 'Irregular Mode',
        phase: 'irregular',
        cycleInfo: {
          cycleRange: user.cycleLengthRange 
            ? `${user.cycleLengthRange.min}-${user.cycleLengthRange.max} days`
            : null,
          lastPeriod: lastPeriod ? `${lastPeriod} days ago` : null,
          averageCycle: null // Can calculate from historical data
        },
        hasLog: !!todayLog
      };
    } else {
      // Regular mode
      homeData = {
        mode: 'regular',
        phaseName: predictions.currentPhase?.phaseName || 'Unknown',
        phase: predictions.currentPhase?.phase || null,
        cycleInfo: {
          cycleDay: predictions.cycleDay 
            ? `Day ${predictions.cycleDay} of ${predictions.cycleLength}`
            : null,
          nextPeriod: predictions.nextPeriod 
            ? `In ${predictions.nextPeriod.daysUntil} days`
            : null,
          nextOvulation: predictions.nextOvulation 
            ? `In ${predictions.nextOvulation.daysUntil} days`
            : null
        },
        predictions: {
          nextPeriodDate: predictions.nextPeriod?.date || null,
          nextOvulationDate: predictions.nextOvulation?.date || null
        },
        hasLog: !!todayLog
      };
    }

    res.json({
      success: true,
      data: homeData
    });
  } catch (error) {
    console.error('Get home data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching home data',
      error: error.message
    });
  }
};

export default getHomeData;
