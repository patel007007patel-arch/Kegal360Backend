import Log from '../../models/Log.model.js';
import Cycle from '../../models/Cycle.model.js';
import User from '../../models/User.model.js';
import { generateCalendarData } from '../../services/cycleCalculation.service.js';

/**
 * Helper function to resolve target user ID from partner code
 * Returns { targetUserId, partnerInfo } or throws error
 */
const resolvePartnerAccess = async (currentUserId, partnerCode) => {
  if (!partnerCode) {
    return { targetUserId: currentUserId, partnerInfo: null };
  }

  // Find partner by code
  const partner = await User.findOne({ partnerCode: partnerCode.toUpperCase() });
  if (!partner) {
    throw new Error('Invalid partner code');
  }

  // Check if current user has access to this partner
  // Access is granted if:
  // 1. Current user is connected to this partner (sharedBy points to partner)
  // 2. Partner has shared with current user (partner.sharedWith includes currentUserId)
  const currentUser = await User.findById(currentUserId);
  const hasAccess = 
    (currentUser.sharedBy && currentUser.sharedBy.toString() === partner._id.toString()) ||
    (partner.sharedWith && partner.sharedWith.some(id => id.toString() === currentUserId.toString()));

  if (!hasAccess && partner._id.toString() !== currentUserId.toString()) {
    throw new Error('You do not have access to view this partner\'s calendar');
  }

  return {
    targetUserId: partner._id,
    partnerInfo: {
      id: partner._id,
      name: partner.name,
      partnerCode: partner.partnerCode
    }
  };
};

export const getEnhancedCalendar = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { month, year, phase, type, partnerCode } = req.query; // type: mood | flow | notes | all (default: all)

    // Resolve target user (self or partner)
    const { targetUserId, partnerInfo } = await resolvePartnerAccess(currentUserId, partnerCode);

    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const yearNum = parseInt(year) || new Date().getFullYear();
    const hasMonth = month !== undefined && month !== '';
    const monthNum = hasMonth ? parseInt(month) : new Date().getMonth() + 1;

    const userCycleInfo = {
      cycleType: user.cycleType,
      cycleLength: user.cycleType === 'regular'
        ? user.cycleLength
        : user.cycleLengthRange,
      lastPeriodStart: user.lastPeriodStart
    };

    const includeAllLogFields = !type || type === 'all';
    const includeMood = includeAllLogFields || type === 'mood';
    const includeFlow = includeAllLogFields || type === 'flow';
    const includeNotes = includeAllLogFields || type === 'notes';

    const mergeLogIntoDay = (dayInfo, log, opts) => {
      if (!log) return;
      const { includeMood, includeFlow, includeNotes } = opts;
      if (includeMood && log.mood) dayInfo.mood = log.mood;
      if (includeFlow) {
        if (log.flow) dayInfo.flow = log.flow;
        if (log.flowIntensity) dayInfo.flowIntensity = log.flowIntensity;
      }
      if (includeNotes && log.notes) dayInfo.notes = log.notes;
      if (includeAllLogFields && log.temperature) dayInfo.temperature = log.temperature;
      if (log.phase) {
        dayInfo.phase = log.phase;
        dayInfo.phaseName = log.phase === 'period' ? 'Menstrual' : (log.phase.charAt(0).toUpperCase() + log.phase.slice(1));
      }
    };

    if (!hasMonth && year) {
      // Yearly view: ?year=2025 — return all 12 months
      const months = [];
      for (let m = 1; m <= 12; m++) {
        const calendarData = generateCalendarData(user, m, yearNum);
        const startDate = new Date(Date.UTC(yearNum, m - 1, 1));
        const endDate = new Date(Date.UTC(yearNum, m, 0, 23, 59, 59, 999));
        let logQuery = { user: targetUserId, date: { $gte: startDate, $lte: endDate } };
        if (phase && phase !== 'all') logQuery.phase = phase === 'menstrual' ? 'period' : phase;
        const logs = await Log.find(logQuery).sort({ date: 1 });
        const enhancedCalendar = calendarData.calendar.map(dayData => {
          const log = logs.find(l => {
            const d = new Date(l.date);
            return d.getUTCDate() === dayData.day && d.getUTCMonth() === m - 1 && d.getUTCFullYear() === yearNum;
          });
          const dayInfo = {
            date: dayData.date,
            day: dayData.day,
            cycleDay: dayData.cycleDay,
            phase: dayData.phase,
            phaseName: dayData.phaseName,
            isPeriod: dayData.isPeriod,
            hasLog: !!log
          };
          mergeLogIntoDay(dayInfo, log, { includeMood, includeFlow, includeNotes });
          return dayInfo;
        });
        const cycles = await Cycle.find({
          user: targetUserId,
          startDate: { $lte: endDate },
          endDate: { $gte: startDate }
        });
        months.push({ month: m, year: yearNum, calendar: enhancedCalendar, phases: calendarData.phases, cycles });
      }
      return res.json({
        success: true,
        data: {
          months,
          year: yearNum,
          userCycleInfo,
          ...(partnerInfo && { partner: partnerInfo })
        }
      });
    }

    // Single-month view (UTC range so calendar and logs align with settings)
    const calendarData = generateCalendarData(user, monthNum, yearNum);
    const startDate = new Date(Date.UTC(yearNum, monthNum - 1, 1));
    const endDate = new Date(Date.UTC(yearNum, monthNum, 0, 23, 59, 59, 999));
    let logQuery = { user: targetUserId, date: { $gte: startDate, $lte: endDate } };
    if (phase && phase !== 'all') logQuery.phase = phase === 'menstrual' ? 'period' : phase;
    const logs = await Log.find(logQuery).sort({ date: 1 });

    const enhancedCalendar = calendarData.calendar.map(dayData => {
      const log = logs.find(l => {
        const logDate = new Date(l.date);
        return logDate.getUTCDate() === dayData.day &&
               logDate.getUTCMonth() === monthNum - 1 &&
               logDate.getUTCFullYear() === yearNum;
      });
      const dayInfo = {
        date: dayData.date,
        day: dayData.day,
        cycleDay: dayData.cycleDay,
        phase: dayData.phase,
        phaseName: dayData.phaseName,
        isPeriod: dayData.isPeriod,
        hasLog: !!log
      };
      mergeLogIntoDay(dayInfo, log, { includeMood, includeFlow, includeNotes });
      return dayInfo;
    });

    const cycles = await Cycle.find({
      user: targetUserId,
      startDate: { $lte: endDate },
      endDate: { $gte: startDate }
    });

    res.json({
      success: true,
      data: {
        calendar: enhancedCalendar,
        phases: calendarData.phases,
        cycles,
        month: monthNum,
        year: yearNum,
        userCycleInfo,
        ...(partnerInfo && { partner: partnerInfo })
      }
    });
  } catch (error) {
    console.error('Get enhanced calendar error:', error);
    const statusCode = error.message.includes('Invalid partner code') || error.message.includes('do not have access') ? 403 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error fetching calendar',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default getEnhancedCalendar;
