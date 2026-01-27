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

    // All values from database: cycles + logs + user profile (no sampling)
    const cycleLengths = cycles.map(c => c.cycleLength).filter(Boolean);
    const periodLengths = cycles.map(c => c.periodLength).filter(Boolean);

    // Days between period starts (from cycles) for irregular stats
    let daysBetweenFlowsAvg = null;
    let longestFlowFreePeriod = null;
    if (cycles.length >= 2) {
      const gaps = [];
      for (let i = 1; i < cycles.length; i++) {
        const prev = new Date(cycles[i - 1].periodStartDate || cycles[i - 1].startDate);
        const curr = new Date(cycles[i].periodStartDate || cycles[i].startDate);
        gaps.push(Math.round((curr - prev) / (1000 * 60 * 60 * 24)));
      }
      if (gaps.length) {
        daysBetweenFlowsAvg = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
        longestFlowFreePeriod = Math.max(...gaps);
      }
    }

    // Current Regular Tracking — from DB: user profile + cycle/period lengths in range
    const currentRegular = user.cycleType === 'regular' ? {
      cycleRange: cycleLengths.length > 0
        ? `${Math.min(...cycleLengths)}-${Math.max(...cycleLengths)} days`
        : (user.cycleLengthRange ? `${user.cycleLengthRange.min}-${user.cycleLengthRange.max} days` : `${user.cycleLength || 28} days`),
      averageCycleLength: cycleLengths.length > 0
        ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length)
        : (user.cycleLength || 28),
      periodRange: periodLengths.length > 0
        ? `${Math.min(...periodLengths)}-${Math.max(...periodLengths)} days`
        : (user.periodLength != null ? `${user.periodLength}-${Math.min(7, user.periodLength + 2)} days` : '5-7 days'),
      averagePeriodLength: periodLengths.length > 0
        ? Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length)
        : (user.periodLength ?? 5)
    } : null;

    // Historical Irregular Stats — from DB: user range + cycle gaps
    const historicalIrregular = user.cycleType === 'irregular' ? {
      flowRange: cycleLengths.length > 0
        ? `${Math.min(...cycleLengths)}-${Math.max(...cycleLengths)} days`
        : (user.cycleLengthRange ? `${user.cycleLengthRange.min}-${user.cycleLengthRange.max} days` : null),
      daysBetweenFlowsAvg,
      periodRange: periodLengths.length > 0
        ? `${Math.min(...periodLengths)}-${Math.max(...periodLengths)} days`
        : (user.periodLength != null ? `${user.periodLength}-7 days` : null),
      longestFlowFreePeriod
    } : null;

    // Wellness Focus — from DB: when user has cycle tracking off/absent
    const wellnessFocus = !user.trackCycle || user.cycleType === 'absent' ? {
      description: 'Focusing on overall well-being and symptom logs'
    } : null;

    // Most common logs per phase — from DB logs only (moods, symptoms, flows)
    const mostCommonLogs = {};
    const phaseKeys = ['luteal', 'menstruation', 'follicular', 'ovulation'];
    const rawPhaseLogs = {};
    logs.forEach(log => {
      const p = log.phase === 'period' ? 'menstruation' : log.phase;
      if (!p || (!log.mood?.length && !log.symptoms?.length && !log.flow)) return;
      if (!rawPhaseLogs[p]) rawPhaseLogs[p] = { moods: [], symptoms: [], flows: [] };
      if (log.mood) rawPhaseLogs[p].moods.push(...log.mood);
      if (log.symptoms) rawPhaseLogs[p].symptoms.push(...log.symptoms);
      if (log.flow) rawPhaseLogs[p].flows.push(log.flow);
    });
    phaseKeys.forEach(phase => {
      const raw = rawPhaseLogs[phase] || { moods: [], symptoms: [], flows: [] };
      const moodCounts = {}; raw.moods.forEach(m => { moodCounts[m] = (moodCounts[m] || 0) + 1; });
      const symptomCounts = {}; raw.symptoms.forEach(s => { symptomCounts[s] = (symptomCounts[s] || 0) + 1; });
      const flowCounts = {}; raw.flows.forEach(f => { flowCounts[f] = (flowCounts[f] || 0) + 1; });
      mostCommonLogs[phase] = {
        moods: Object.keys(moodCounts).sort((a, b) => moodCounts[b] - moodCounts[a]).slice(0, 5),
        symptoms: Object.keys(symptomCounts).sort((a, b) => symptomCounts[b] - symptomCounts[a]).slice(0, 5),
        flows: Object.keys(flowCounts).sort((a, b) => flowCounts[b] - flowCounts[a]).slice(0, 3)
      };
    });

    // Basal Temperature Chart — from DB logs (temperature); cycleDay from user's lastPeriodStart + cycleLength
    const cycleLen = user.cycleType === 'regular' ? (user.cycleLength || 28) : 28;
    const tempCycleDay = (d) => {
      if (!user.lastPeriodStart || !cycleLen) return null;
      const day = new Date(d);
      day.setHours(0, 0, 0, 0);
      const start = new Date(user.lastPeriodStart);
      start.setHours(0, 0, 0, 0);
      const days = Math.floor((day - start) / (1000 * 60 * 60 * 24));
      return (days % cycleLen) + 1;
    };
    const temperatureLogs = logs
      .filter(log => log.temperature && log.temperature.value != null)
      .map(log => ({
        date: log.date,
        temperature: log.temperature.value,
        unit: log.temperature.unit || 'fahrenheit',
        cycleDay: tempCycleDay(log.date)
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

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
        wellnessFocus,
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
