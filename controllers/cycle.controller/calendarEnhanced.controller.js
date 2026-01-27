import Log from '../../models/Log.model.js';
import Cycle from '../../models/Cycle.model.js';
import User from '../../models/User.model.js';
import { generateCalendarData } from '../../services/cycleCalculation.service.js';

export const getEnhancedCalendar = async (req, res) => {
  try {
    const userId = req.user._id;
    const { month, year, phase, type } = req.query; // type: mood, flow, notes

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const monthNum = parseInt(month) || new Date().getMonth() + 1;
    const yearNum = parseInt(year) || new Date().getFullYear();

    // Generate calendar data based on user's cycle calculations
    const calendarData = generateCalendarData(user, monthNum, yearNum);

    // Get actual logs for this month
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);

    let logQuery = {
      user: userId,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    };

    if (phase && phase !== 'all') {
      logQuery.phase = phase;
    }

    const logs = await Log.find(logQuery).sort({ date: 1 });

    // Merge calculated calendar data with actual logs
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

      // Add log data based on type filter
      if (log) {
        if (type === 'mood' && log.mood) {
          dayInfo.mood = log.mood;
        }
        if (type === 'flow' && log.flow) {
          dayInfo.flow = log.flow;
          dayInfo.flowIntensity = log.flowIntensity; // A, B, C notation
        }
        if (type === 'notes' && log.notes) {
          dayInfo.notes = log.notes;
        }
        // Always include phase from log if exists (user override)
        if (log.phase) {
          dayInfo.phase = log.phase;
          dayInfo.phaseName = log.phase.charAt(0).toUpperCase() + log.phase.slice(1);
        }
      }

      return dayInfo;
    });

    // Get cycles for this period
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
        userCycleInfo: {
          cycleType: user.cycleType,
          cycleLength: user.cycleType === 'regular' 
            ? user.cycleLength 
            : user.cycleLengthRange,
          lastPeriodStart: user.lastPeriodStart
        }
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
