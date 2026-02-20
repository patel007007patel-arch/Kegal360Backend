import User from '../../models/User.model.js';
import Log from '../../models/Log.model.js';
import Cycle from '../../models/Cycle.model.js';
import { calculateCyclePredictions, generateCalendarData } from '../../services/cycleCalculation.service.js';

/**
 * Build home-style response for a given user (used for partner shared view).
 * Same shape as GET /api/cycles/home.
 */
async function buildHomeDataForUser(user) {
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
  const todayLog = await Log.findOne({ user: user._id, date: { $gte: today, $lt: tomorrow } });
  baseResponse.hasLog = !!todayLog;

  if (!user.trackCycle || user.cycleType === 'absent') {
    const UserProgress = (await import('../../models/UserProgress.model.js')).default;
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);
    const progressDocs = await UserProgress.find({
      user: user._id,
      sessionStartedAt: { $gte: weekStart }
    }).select('sessionStartedAt sessionCompletedAt').lean();
    const activeDaySet = new Set();
    progressDocs.forEach((p) => {
      if (p.sessionStartedAt) activeDaySet.add(new Date(p.sessionStartedAt).toDateString());
    });
    const activeDays = activeDaySet.size;
    const restDays = Math.max(0, 7 - activeDays);
    return {
      ...baseResponse,
      mode: 'wellness',
      phaseName: 'Wellness Mode',
      phase: 'wellness',
      phaseDisplayLabel: 'Cycle tracking off Wellness Mode',
      cycleInfo: null,
      wellnessStats: { yogaSessionsThisWeek: progressDocs.length, activeDays, restDays }
    };
  }

  if (user.cycleType === 'irregular') {
    const lastPeriodDaysAgo = user.lastPeriodStart
      ? Math.floor((today - new Date(user.lastPeriodStart)) / (1000 * 60 * 60 * 24))
      : null;
    const pastCycles = await Cycle.find({ user: user._id }).sort({ startDate: -1 }).limit(12).select('cycleLength').lean();
    const avgCycle = pastCycles.length
      ? Math.round(pastCycles.reduce((s, c) => s + (c.cycleLength || 0), 0) / pastCycles.length)
      : null;
    const cycleRange = user.cycleLengthRange ? `${user.cycleLengthRange.min}-${user.cycleLengthRange.max}` : null;
    return {
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
    };
  }

  const predictions = calculateCyclePredictions(user);
  const phase = predictions.currentPhase?.phase || null;
  const phaseName = predictions.currentPhase?.phaseName === 'Period' ? 'Period' : (predictions.currentPhase?.phaseName || 'Unknown');
  const phaseDisplayLabel = phaseName !== 'Unknown' ? `Current Phase ${phaseName}` : 'Current Phase';
  const cycleDayNumber = predictions.cycleDay ?? null;
  const nextPeriodDays = predictions.nextPeriod?.daysUntil ?? null;
  const nextOvulationDays = predictions.nextOvulation?.daysUntil ?? null;

  return {
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
  };
}

export const generateShareCode = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Always generate a new unique code
    await user.generatePartnerCode();
    await user.save();

    res.json({
      success: true,
      message: 'New partner code generated successfully',
      data: {
        code: user.partnerCode,
        shareLink: `${process.env.FRONTEND_URL}/connect?code=${user.partnerCode}`
      }
    });
  } catch (error) {
    console.error('Generate share code error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating share code',
      error: error.message
    });
  }
};

export const getMyPartnerCode = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.partnerCode) {
      // Generate if doesn't exist
      await user.generatePartnerCode();
      await user.save();
    }

    res.json({
      success: true,
      data: {
        code: user.partnerCode,
        shareLink: `${process.env.FRONTEND_URL}/connect?code=${user.partnerCode}`
      }
    });
  } catch (error) {
    console.error('Get partner code error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching partner code',
      error: error.message
    });
  }
};

export const connectPartner = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user._id;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Partner code is required'
      });
    }

    // Find partner by code (codes are stored uppercase)
    const partner = await User.findOne({ partnerCode: (code || '').toString().trim().toUpperCase() });

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Invalid partner code'
      });
    }

    if (partner._id.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot connect to yourself'
      });
    }

    // Connector (current user) can now see code owner's data via GET /partners/shared
    const user = await User.findById(userId);
    user.sharedBy = partner._id;
    await user.save();

    // Code owner: track who is viewing their data (optional, for "shared with" list)
    if (!partner.sharedWith) partner.sharedWith = [];
    if (!partner.sharedWith.some(id => id.toString() === userId.toString())) {
      partner.sharedWith.push(userId);
      await partner.save();
    }

    res.json({
      success: true,
      message: 'Partner connected successfully',
      data: {
        partner: {
          id: partner._id,
          name: partner.name,
          email: partner.email
        }
      }
    });
  } catch (error) {
    console.error('Connect partner error:', error);
    res.status(500).json({
      success: false,
      message: 'Error connecting partner',
      error: error.message
    });
  }
};

/**
 * GET /api/partners/shared
 * Returns only home-style data for the connected partner (same shape as GET /api/cycles/home).
 */
export const getSharedData = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).populate('sharedBy');

    if (!user.sharedBy) {
      return res.status(404).json({
        success: false,
        message: 'No partner connected'
      });
    }

    const partner = user.sharedBy;
    const homeData = await buildHomeDataForUser(partner);

    res.json({
      success: true,
      data: {
        partner: {
          id: partner._id,
          name: partner.name,
          email: partner.email
        },
        ...homeData
      }
    });
  } catch (error) {
    console.error('Get shared data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching shared data',
      error: error.message
    });
  }
};

/**
 * GET /api/partners/calendar/enhanced
 * Same as GET /api/cycles/calendar/enhanced but for the connected partner only (no partnerCode needed).
 * Query: month, year, phase, type (mood | flow | notes | all). Requires user to be connected.
 */
export const getPartnerCalendarEnhanced = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).populate('sharedBy');
    if (!user.sharedBy) {
      return res.status(404).json({
        success: false,
        message: 'No partner connected'
      });
    }

    const partner = user.sharedBy;
    const targetUserId = partner._id;
    const { month, year, phase, type } = req.query;

    const yearNum = parseInt(year) || new Date().getFullYear();
    const hasMonth = month !== undefined && month !== '';
    const monthNum = hasMonth ? parseInt(month) : new Date().getMonth() + 1;

    const userCycleInfo = {
      cycleType: partner.cycleType,
      cycleLength: partner.cycleType === 'regular' ? partner.cycleLength : partner.cycleLengthRange,
      lastPeriodStart: partner.lastPeriodStart
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

    const partnerInfo = { id: partner._id, name: partner.name, partnerCode: partner.partnerCode };

    if (!hasMonth && year) {
      const months = [];
      for (let m = 1; m <= 12; m++) {
        const calendarData = generateCalendarData(partner, m, yearNum);
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
        data: { months, year: yearNum, userCycleInfo, partner: partnerInfo }
      });
    }

    const calendarData = generateCalendarData(partner, monthNum, yearNum);
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

    return res.json({
      success: true,
      data: {
        calendar: enhancedCalendar,
        phases: calendarData.phases,
        cycles,
        month: monthNum,
        year: yearNum,
        userCycleInfo,
        partner: partnerInfo
      }
    });
  } catch (error) {
    console.error('Get partner calendar enhanced error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching partner calendar',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * POST /api/partners/disconnect (or DELETE)
 * Revoke the connected partner. After this, GET /partners/shared and calendar will return "No partner connected"
 * until the user connects again with the partner code.
 */
export const disconnectPartner = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user.sharedBy) {
      return res.status(404).json({
        success: false,
        message: 'No partner connected'
      });
    }

    const partnerId = user.sharedBy;
    user.sharedBy = undefined;
    await user.save();

    const partner = await User.findById(partnerId);
    if (partner && partner.sharedWith && partner.sharedWith.length) {
      partner.sharedWith = partner.sharedWith.filter(id => id.toString() !== userId.toString());
      await partner.save();
    }

    res.json({
      success: true,
      message: 'Partner disconnected. Connect again with their code to see their data.'
    });
  } catch (error) {
    console.error('Disconnect partner error:', error);
    res.status(500).json({
      success: false,
      message: 'Error disconnecting partner',
      error: error.message
    });
  }
};

// View partner data using partner code (for partners to login/view)
export const viewPartnerByCode = async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Partner code is required'
      });
    }

    // Find partner by code
    const partner = await User.findOne({ partnerCode: code.toUpperCase() });

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Invalid partner code'
      });
    }

    // Get partner's cycle data
    const Log = (await import('../../models/Log.model.js')).default;
    const Cycle = (await import('../../models/Cycle.model.js')).default;
    const { calculateCyclePredictions } = await import('../../services/cycleCalculation.service.js');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const partnerLogs = await Log.find({
      user: partner._id,
      date: { $gte: thirtyDaysAgo }
    })
      .sort({ date: -1 })
      .limit(30);

    const partnerCycles = await Cycle.find({ user: partner._id })
      .sort({ startDate: -1 })
      .limit(12);

    const partnerPredictions = calculateCyclePredictions(partner);

    res.json({
      success: true,
      data: {
        partner: {
          id: partner._id,
          name: partner.name,
          partnerCode: partner.partnerCode
        },
        cycleInfo: {
          currentPhase: partnerPredictions.currentPhase,
          cycleDay: partnerPredictions.cycleDay,
          nextPeriod: partnerPredictions.nextPeriod,
          nextOvulation: partnerPredictions.nextOvulation
        },
        logs: partnerLogs,
        cycles: partnerCycles
      }
    });
  } catch (error) {
    console.error('View partner by code error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching partner data',
      error: error.message
    });
  }
};

/**
 * Gift subscription: logged-in user pays and subscription is applied to the user who owns the code.
 * Used when partner views by code and clicks "Gift subscription".
 */
export const purchaseSubscriptionForPartner = async (req, res) => {
  try {
    const { code, plan, paymentId, paymentMethod } = req.body;
    const payerId = req.user._id;

    if (!code || !plan) {
      return res.status(400).json({
        success: false,
        message: 'Partner code and plan are required'
      });
    }

    if (!['monthly', 'yearly'].includes(plan)) {
      return res.status(400).json({
        success: false,
        message: 'Plan must be monthly or yearly'
      });
    }

    const recipient = await User.findOne({ partnerCode: (code || '').toString().toUpperCase() });
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Invalid partner code'
      });
    }

    if (recipient._id.toString() === payerId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot purchase a subscription for yourself'
      });
    }

    const Subscription = (await import('../../models/Subscription.model.js')).default;
    const prices = { monthly: 4.99, yearly: 39.99 };

    const startDate = new Date();
    const endDate = new Date();
    if (plan === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    let subscription = await Subscription.findOne({ user: recipient._id });
    if (subscription) {
      subscription.plan = plan;
      subscription.price = prices[plan];
      subscription.startDate = startDate;
      subscription.endDate = endDate;
      subscription.isActive = true;
      subscription.isTrial = false;
      subscription.trialEndDate = undefined;
      subscription.paymentId = paymentId || subscription.paymentId;
      subscription.paymentMethod = paymentMethod || subscription.paymentMethod;
      subscription.autoRenew = false;
      subscription.cancelledAt = null;
    } else {
      subscription = new Subscription({
        user: recipient._id,
        plan,
        price: prices[plan],
        startDate,
        endDate,
        isActive: true,
        isTrial: false,
        paymentId,
        paymentMethod,
        autoRenew: false
      });
    }
    await subscription.save();

    await User.findByIdAndUpdate(recipient._id, {
      'subscription.plan': plan,
      'subscription.startDate': startDate,
      'subscription.endDate': endDate,
      'subscription.isActive': true,
      'subscription.paymentId': paymentId || undefined
    });

    res.status(201).json({
      success: true,
      message: 'Subscription gifted successfully',
      data: {
        subscription: {
          plan: subscription.plan,
          endDate: subscription.endDate,
          recipient: { id: recipient._id, name: recipient.name }
        }
      }
    });
  } catch (error) {
    console.error('Purchase subscription for partner error:', error);
    res.status(500).json({
      success: false,
      message: 'Error purchasing subscription for partner',
      error: error.message
    });
  }
};

export default { generateShareCode, getMyPartnerCode, connectPartner, getSharedData, getPartnerCalendarEnhanced, disconnectPartner, viewPartnerByCode, purchaseSubscriptionForPartner };
