import User from '../../models/User.model.js';
import Log from '../../models/Log.model.js';
import Cycle from '../../models/Cycle.model.js';
import { calculateCyclePredictions } from '../../services/cycleCalculation.service.js';

/**
 * GET /api/cycles/home
 * Phase is resolved from the authenticated user (userId from token via req.user._id).
 * Returns only phase-based data: no video-related fields.
 *
 * Total 6 phases, each with different fields:
 * 1. Period (regular)     → cycleInfo: yourCycleDay, yourCycleDayLabel, nextPeriod, nextPeriodDays, nextOvulation, nextOvulationDays
 * 2. Follicular (regular) → same cycleInfo fields
 * 3. Ovulation (regular)  → same cycleInfo fields
 * 4. Luteal (regular)     → same cycleInfo fields
 * 5. Irregular Mode       → cycleInfo: cycleRange, lastPeriod, averageCycle
 * 6. Wellness Mode        → wellnessStats: yogaSessionsThisWeek, activeDays, restDays
 */
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

    const baseResponse = {
      user: {
        id: user._id,
        name: user.name || user.email?.split('@')[0] || 'User'
      },
      hasLog: false
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayLog = await Log.findOne({ user: userId, date: { $gte: today, $lt: tomorrow } });
    baseResponse.hasLog = !!todayLog;

    // Wellness mode: cycle tracking off or cycleType absent
    if (!user.trackCycle || user.cycleType === 'absent') {
      const YogaSession = (await import('../../models/YogaSession.model.js')).default;
      const MeditationSession = (await import('../../models/MeditationSession.model.js')).default;
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - 7);
      weekStart.setHours(0, 0, 0, 0);

      const [yogaSessions, yogaDocs, meditationDocs] = await Promise.all([
        YogaSession.countDocuments({ user: userId, date: { $gte: weekStart } }),
        YogaSession.find({ user: userId, date: { $gte: weekStart } }).select('date').lean(),
        MeditationSession.find({ user: userId, date: { $gte: weekStart } }).select('date').lean()
      ]);

      const activeDaySet = new Set();
      [...yogaDocs, ...meditationDocs].forEach((s) => activeDaySet.add(new Date(s.date).toDateString()));
      const activeDays = activeDaySet.size;
      const restDays = Math.max(0, 7 - activeDays);

      return res.json({
        success: true,
        data: {
          ...baseResponse,
          mode: 'wellness',
          phaseName: 'Wellness Mode',
          phase: 'wellness',
          phaseDisplayLabel: 'Cycle tracking off Wellness Mode',
          cycleInfo: null,
          wellnessStats: {
            yogaSessionsThisWeek: yogaSessions,
            activeDays,
            restDays
          }
        }
      });
    }

    const predictions = calculateCyclePredictions(user);

    // Irregular mode
    if (user.cycleType === 'irregular') {
      const lastPeriodDaysAgo = user.lastPeriodStart
        ? Math.floor((today - new Date(user.lastPeriodStart)) / (1000 * 60 * 60 * 24))
        : null;

      const pastCycles = await Cycle.find({ user: userId }).sort({ startDate: -1 }).limit(12).select('cycleLength').lean();
      const avgCycle = pastCycles.length
        ? Math.round(pastCycles.reduce((s, c) => s + (c.cycleLength || 0), 0) / pastCycles.length)
        : null;

      const cycleRange = user.cycleLengthRange
        ? `${user.cycleLengthRange.min}-${user.cycleLengthRange.max}`
        : null;

      return res.json({
        success: true,
        data: {
          ...baseResponse,
          mode: 'irregular',
          phaseName: 'Irregular Mode',
          phase: 'irregular',
          cycleInfo: {
            cycleRange: cycleRange || null,
            lastPeriod: lastPeriodDaysAgo != null ? `${lastPeriodDaysAgo} days ago` : null,
            averageCycle: avgCycle != null ? avgCycle : null
          },
          wellnessStats: null
        }
      });
    }

    // Regular mode: 4 phases — Period, Follicular, Ovulation, Luteal (each with same 3 data fields)
    const phase = predictions.currentPhase?.phase || null;
    const phaseName = predictions.currentPhase?.phaseName === 'Period'
      ? 'Period'
      : (predictions.currentPhase?.phaseName || 'Unknown');
    const phaseDisplayLabel = phaseName !== 'Unknown' ? `Current Phase ${phaseName}` : 'Current Phase';
    const cycleDayNumber = predictions.cycleDay ?? null;
    const nextPeriodDays = predictions.nextPeriod?.daysUntil ?? null;
    const nextOvulationDays = predictions.nextOvulation?.daysUntil ?? null;

    return res.json({
      success: true,
      data: {
        ...baseResponse,
        mode: 'regular',
        phaseName,
        phase,
        phaseDisplayLabel,
        cycleInfo: {
          yourCycleDay: cycleDayNumber != null ? cycleDayNumber : null,
          yourCycleDayLabel: cycleDayNumber != null ? `Day ${cycleDayNumber}` : null,
          nextPeriod: nextPeriodDays != null ? `In ${nextPeriodDays} days` : null,
          nextPeriodDays,
          nextOvulation: nextOvulationDays != null ? `In ${nextOvulationDays} days` : null,
          nextOvulationDays
        },
        wellnessStats: null
      }
    });
  } catch (error) {
    console.error('Get home data error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching home data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default getHomeData;
