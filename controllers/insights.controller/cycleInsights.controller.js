import Log from '../../models/Log.model.js';
import Cycle from '../../models/Cycle.model.js';
import User from '../../models/User.model.js';

export const getCycleInsights = async (req, res) => {
  try {
    const userId = req.user._id;
    const { startDate, endDate, period } = req.query;

    const user = await User.findById(userId);
    
    // Determine date range
    let dateRange = {};
    if (period) {
      // Format: "Jan 2024 - Dec 2024"
      const [startPeriod, endPeriod] = period.split(' - ');
      const start = parsePeriodString(startPeriod);
      const end = parsePeriodString(endPeriod);
      dateRange = {
        startDate: new Date(start.year, start.month - 1, 1),
        endDate: new Date(end.year, end.month, 0, 23, 59, 59)
      };
    } else if (startDate && endDate) {
      dateRange = {
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      };
    } else {
      // Default to last 12 months
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 12);
      dateRange = { startDate: start, endDate: end };
    }

    // Get cycles in range
    const cycles = await Cycle.find({
      user: userId,
      startDate: { $gte: dateRange.startDate, $lte: dateRange.endDate }
    }).sort({ startDate: 1 });

    // Get logs in range
    const logs = await Log.find({
      user: userId,
      date: { $gte: dateRange.startDate, $lte: dateRange.endDate }
    });

    // Calculate statistics
    const cycleLengths = cycles.map(c => c.cycleLength).filter(Boolean);
    const periodLengths = cycles.map(c => c.periodLength).filter(Boolean);

    // Current Regular Tracking (if user has regular cycles)
    const currentRegular = user.cycleType === 'regular' ? {
      cycleRange: user.cycleLengthRange ? 
        `${user.cycleLengthRange.min}-${user.cycleLengthRange.max} days` : 
        `${user.cycleLength} days`,
      averageCycleLength: cycleLengths.length > 0 ?
        Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length) : user.cycleLength,
      periodRange: periodLengths.length > 0 ?
        `${Math.min(...periodLengths)}-${Math.max(...periodLengths)} days` : '5-7 days',
      averagePeriodLength: periodLengths.length > 0 ?
        Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length) : 5
    } : null;

    // Historical Irregular Stats (if user had irregular cycles before)
    const historicalIrregular = user.cycleType === 'irregular' ? {
      flowRange: user.cycleLengthRange ? 
        `${user.cycleLengthRange.min}-${user.cycleLengthRange.max} days` : null,
      daysBetweenFlowsAvg: null, // Calculate from logs
      periodRange: periodLengths.length > 0 ?
        `${Math.min(...periodLengths)}-${Math.max(...periodLengths)} days` : null,
      longestFlowFreePeriod: null // Calculate from cycles
    } : null;

    // Most Common Logs Per Phase
    const phaseLogs = {};
    logs.forEach(log => {
      if (log.phase && (log.mood || log.symptoms || log.flow)) {
        if (!phaseLogs[log.phase]) {
          phaseLogs[log.phase] = { moods: [], symptoms: [], flows: [] };
        }
        if (log.mood) phaseLogs[log.phase].moods.push(...log.mood);
        if (log.symptoms) phaseLogs[log.phase].symptoms.push(...log.symptoms);
        if (log.flow) phaseLogs[log.phase].flows.push(log.flow);
      }
    });

    const mostCommonLogs = {};
    Object.keys(phaseLogs).forEach(phase => {
      const moodCounts = {};
      phaseLogs[phase].moods.forEach(mood => {
        moodCounts[mood] = (moodCounts[mood] || 0) + 1;
      });
      
      mostCommonLogs[phase] = {
        moods: Object.keys(moodCounts)
          .sort((a, b) => moodCounts[b] - moodCounts[a])
          .slice(0, 3),
        symptoms: [],
        flows: []
      };
    });

    // Basal Temperature Chart Data
    const temperatureLogs = logs
      .filter(log => log.temperature && log.temperature.value)
      .map(log => ({
        date: log.date,
        temperature: log.temperature.value,
        unit: log.temperature.unit
      }))
      .sort((a, b) => a.date - b.date);

    // Cycle Length Bar Chart Data
    const cycleChartData = cycles.map(cycle => ({
      month: new Date(cycle.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      cycleLength: cycle.cycleLength,
      periodLength: cycle.periodLength || 5
    }));

    res.json({
      success: true,
      data: {
        period: period || `${dateRange.startDate.toLocaleDateString()} - ${dateRange.endDate.toLocaleDateString()}`,
        currentRegularTracking: currentRegular,
        historicalIrregularStats: historicalIrregular,
        mostCommonLogsPerPhase: mostCommonLogs,
        basalTemperatureChart: temperatureLogs,
        cycleLengthChart: cycleChartData,
        stats: {
          averageCycleLength: cycleLengths.length > 0 ?
            Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length) : null,
          shortestCycle: cycleLengths.length > 0 ? Math.min(...cycleLengths) : null,
          longestCycle: cycleLengths.length > 0 ? Math.max(...cycleLengths) : null,
          averagePeriodLength: periodLengths.length > 0 ?
            Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length) : null
        }
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
};

const parsePeriodString = (periodStr) => {
  const [month, year] = periodStr.trim().split(' ');
  const months = {
    'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
    'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
  };
  return {
    month: months[month] || 1,
    year: parseInt(year) || new Date().getFullYear()
  };
};

export default getCycleInsights;
