import Log from '../../models/Log.model.js';
import Cycle from '../../models/Cycle.model.js';
import User from '../../models/User.model.js';
import { generateCalendarData } from '../../services/cycleCalculation.service.js';

export const getEnhancedCalendar = async (req, res) => {
  try {
    const userId = req.user._id;
    const { month, year, phase, type } = req.query; // type: mood | flow | notes | all (default: all)

    const user = await User.findById(userId);
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
        const startDate = new Date(yearNum, m - 1, 1);
        const endDate = new Date(yearNum, m, 0, 23, 59, 59);
        let logQuery = { user: userId, date: { $gte: startDate, $lte: endDate } };
        if (phase && phase !== 'all') logQuery.phase = phase;
        const logs = await Log.find(logQuery).sort({ date: 1 });
        const enhancedCalendar = calendarData.calendar.map(dayData => {
          const log = logs.find(l => {
            const d = new Date(l.date);
            return d.getDate() === dayData.day && d.getMonth() === m - 1 && d.getFullYear() === yearNum;
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
          user: userId,
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
          userCycleInfo
        }
      });
    }

    // Single-month view
    const calendarData = generateCalendarData(user, monthNum, yearNum);
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);
    let logQuery = { user: userId, date: { $gte: startDate, $lte: endDate } };
    if (phase && phase !== 'all') logQuery.phase = phase;
    const logs = await Log.find(logQuery).sort({ date: 1 });

    const enhancedCalendar = calendarData.calendar.map(dayData => {
      const log = logs.find(l => {
        const logDate = new Date(l.date);
        return logDate.getDate() === dayData.day &&
               logDate.getMonth() === monthNum - 1 &&
               logDate.getFullYear() === yearNum;
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
      user: userId,
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
        userCycleInfo
      }
    });
  } catch (error) {
    console.error('Get enhanced calendar error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching calendar',
      error: error.message
    });
  }
};

export default getEnhancedCalendar;
