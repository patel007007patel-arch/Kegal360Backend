import Log from '../../models/Log.model.js';
import Cycle from '../../models/Cycle.model.js';
import User from '../../models/User.model.js';
import { getEffectiveCycleLength } from '../../services/cycleCalculation.service.js';

export const exportCycleData = async (req, res) => {
  try {
    const userId = req.user._id;
    const { period } = req.query;

    const user = await User.findById(userId);
    
    let dateRange = {};
    if (period) {
      const [startPeriod, endPeriod] = period.split(' - ');
      const parsePeriod = (str) => {
        const [month, year] = str.trim().split(' ');
        const months = {
          'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
          'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
        };
        return { month: months[month] || 1, year: parseInt(year) || new Date().getFullYear() };
      };
      const start = parsePeriod(startPeriod);
      const end = parsePeriod(endPeriod);
      dateRange = {
        startDate: new Date(start.year, start.month - 1, 1),
        endDate: new Date(end.year, end.month, 0, 23, 59, 59)
      };
    } else {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 12);
      dateRange = { startDate: start, endDate: end };
    }

    const cycles = await Cycle.find({
      user: userId,
      startDate: { $gte: dateRange.startDate, $lte: dateRange.endDate }
    }).sort({ startDate: 1 });

    const logs = await Log.find({
      user: userId,
      date: { $gte: dateRange.startDate, $lte: dateRange.endDate }
    });

    const cycleLengths = cycles.map(c => c.cycleLength).filter(Boolean);
    const periodLengths = cycles.map(c => c.periodLength).filter(Boolean);
    const effectiveLen = user ? getEffectiveCycleLength(user) : null;

    const exportData = {
      exportedOn: new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      period: period || `${dateRange.startDate.toLocaleDateString()} - ${dateRange.endDate.toLocaleDateString()}`,
      summary: {
        averageCycleLength: cycleLengths.length > 0
          ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length)
          : effectiveLen,
        shortestCycle: cycleLengths.length > 0
          ? Math.min(...cycleLengths)
          : (user?.cycleType === 'regular' ? user?.cycleLength : user?.cycleLengthRange?.min) ?? null,
        longestCycle: cycleLengths.length > 0
          ? Math.max(...cycleLengths)
          : (user?.cycleType === 'regular' ? user?.cycleLength : user?.cycleLengthRange?.max) ?? null,
        averagePeriodLength: periodLengths.length > 0
          ? Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length)
          : (user?.periodLength ?? null)
      },
      cycleList: cycles.map(cycle => ({
        month: new Date(cycle.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        cycleLength: cycle.cycleLength,
        periodLength: cycle.periodLength || 5
      })),
      totalCycles: cycles.length,
      totalLogs: logs.length
    };

    res.json({
      success: true,
      message: 'Cycle data exported successfully',
      data: exportData
    });
  } catch (error) {
    console.error('Export cycle data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting cycle data',
      error: error.message
    });
  }
};

export default exportCycleData;
