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

    // Helpers (keep response fields consistent + ordered)
    const isPresentRange = (d) => {
      const end = new Date(d);
      const now = new Date();
      return Math.abs(now.getTime() - end.getTime()) <= 1000 * 60 * 60 * 24 * 2; // within ~2 days
    };
    const formatMonthYear = (d) =>
      new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const sampledLabel = () => {
      const start = formatMonthYear(dateRange.startDate);
      const end = isPresentRange(dateRange.endDate) ? 'Present' : formatMonthYear(dateRange.endDate);
      return `${start} - ${end}`;
    };
    const toDays = (n) => (n == null || Number.isNaN(Number(n)) ? null : `${Number(n)} days`);
    const rangeDays = (min, max) => {
      if (min == null || max == null) return null;
      return `${min}-${max} days`;
    };

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

    // Current Regular Tracking — DB computed (cycles + user profile fallback)
    const currentRegularTracking = {
      sampled: sampledLabel(),
      cycleRange: rangeDays(
        cycleLengths.length ? Math.min(...cycleLengths) : (user?.cycleLengthRange?.min ?? user?.cycleLength ?? null),
        cycleLengths.length ? Math.max(...cycleLengths) : (user?.cycleLengthRange?.max ?? user?.cycleLength ?? null)
      ),
      averageCycleLength: toDays(
        cycleLengths.length
          ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length)
          : (user?.cycleLength ?? null)
      ),
      periodRange: rangeDays(
        periodLengths.length ? Math.min(...periodLengths) : (user?.periodLength ?? null),
        periodLengths.length ? Math.max(...periodLengths) : (user?.periodLength ?? null)
      ),
      averagePeriodLength: toDays(
        periodLengths.length
          ? Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length)
          : (user?.periodLength ?? null)
      )
    };

    // Historical Irregular Stats — DB computed (cycle gaps + ranges)
    const historicalIrregularStats = {
      sampled: sampledLabel(),
      flowRange: rangeDays(
        cycleLengths.length ? Math.min(...cycleLengths) : (user?.cycleLengthRange?.min ?? null),
        cycleLengths.length ? Math.max(...cycleLengths) : (user?.cycleLengthRange?.max ?? null)
      ),
      daysBetweenFlowsAvg: toDays(daysBetweenFlowsAvg),
      periodRange: rangeDays(
        periodLengths.length ? Math.min(...periodLengths) : (user?.periodLength ?? null),
        periodLengths.length ? Math.max(...periodLengths) : (user?.periodLength ?? null)
      ),
      longestFlowFreePeriod: toDays(longestFlowFreePeriod)
    };

    // Wellness Focus — DB driven (only from user tracking state)
    const wellnessFocus = {
      sampled: sampledLabel(),
      description: (!user?.trackCycle || user?.cycleType === 'absent')
        ? 'Focusing on overall well-being and symptom logs'
        : null
    };

    // Most Common Logs Per Phase — DB driven (moods only; UI maps to emojis)
    const phaseOrder = [
      ['luteal', 'Luteal'],
      ['menstruation', 'Menstruation'],
      ['follicular', 'Follicular'],
      ['ovulation', 'Ovulation']
    ];
    const phaseMoods = {};
    logs.forEach(log => {
      const key = log.phase === 'period' ? 'menstruation' : log.phase;
      if (!key || !Array.isArray(log.mood) || log.mood.length === 0) return;
      if (!phaseMoods[key]) phaseMoods[key] = [];
      phaseMoods[key].push(...log.mood);
    });
    const mostCommonLogsPerPhase = { sampled: sampledLabel() };
    phaseOrder.forEach(([key, label]) => {
      const moods = phaseMoods[key] || [];
      const counts = {};
      moods.forEach(m => { counts[m] = (counts[m] || 0) + 1; });
      mostCommonLogsPerPhase[label] = Object.keys(counts)
        .sort((a, b) => counts[b] - counts[a])
        .slice(0, 3);
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
    const basalTemperatureChart = {
      sampled: sampledLabel(),
      points: logs
        .filter(log => log.temperature && log.temperature.value != null)
        .map(log => ({
          date: log.date,
          value: log.temperature.value,
          unit: log.temperature.unit || 'fahrenheit',
          cycleDay: tempCycleDay(log.date)
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date))
    };

    // Cycle List (bar chart) — DB driven
    const cycleList = {
      sampled: sampledLabel(),
      items: cycles.map(cycle => ({
        month: new Date(cycle.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        cycleLength: toDays(cycle.cycleLength),
        periodLength: toDays(cycle.periodLength)
      }))
    };

    res.json({
      success: true,
      data: {
        // Keep keys exactly in UI order, with DB-calculated values only
        period: period || `${sampledLabel()}`,
        currentRegularTracking,
        historicalIrregularStats,
        wellnessFocus,
        mostCommonLogsPerPhase,
        basalTemperatureChart,
        cycleList
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
