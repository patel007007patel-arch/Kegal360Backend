import Log from '../../models/Log.model.js';
import User from '../../models/User.model.js';
import { resolveCustomLogsForLog, resolveCustomLogsForLogs } from '../../utils/resolveLogCustomLogs.js';
import { getUtcDayRange, getUtcMonthRange } from '../../utils/dateUtils.js';

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
  const currentUser = await User.findById(currentUserId);
  const hasAccess = 
    (currentUser.sharedBy && currentUser.sharedBy.toString() === partner._id.toString()) ||
    (partner.sharedWith && partner.sharedWith.some(id => id.toString() === currentUserId.toString()));

  if (!hasAccess && partner._id.toString() !== currentUserId.toString()) {
    throw new Error('You do not have access to view this partner\'s logs');
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

export const getLogs = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { startDate, endDate, phase, month, year, partnerCode } = req.query;

    // Resolve target user (self or partner)
    const { targetUserId, partnerInfo } = await resolvePartnerAccess(currentUserId, partnerCode);

    let query = { user: targetUserId };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (month && year) {
      const { start, end } = getUtcMonthRange(year, month);
      query.date = { $gte: start, $lte: end };
    }

    if (phase) {
      // UI uses "menstrual"; Log model stores "period"
      query.phase = phase === 'menstrual' ? 'period' : phase;
    }

    let logs = await Log.find(query)
      .sort({ date: -1 })
      .lean();

    await resolveCustomLogsForLogs(logs, targetUserId);

    res.json({
      success: true,
      data: {
        logs,
        count: logs.length
      }
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching logs',
      error: error.message
    });
  }
};

/** Get the single log for a given date (for calendar selected-date detail). */
export const getLogByDate = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { date, partnerCode } = req.query; // date=YYYY-MM-DD
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Query "date" is required (e.g. date=2025-09-12)'
      });
    }

    // Resolve target user (self or partner)
    const { targetUserId, partnerInfo } = await resolvePartnerAccess(currentUserId, partnerCode);

    const { start: dayStart, end: dayEnd } = getUtcDayRange(date);

    let log = await Log.findOne({
      user: targetUserId,
      date: { $gte: dayStart, $lt: dayEnd }
    }).lean();

    if (log) await resolveCustomLogsForLog(log, targetUserId);

    res.json({
      success: true,
      data: {
        log: log || null,
        ...(partnerInfo && { partner: partnerInfo })
      }
    });
  } catch (error) {
    console.error('Get log by date error:', error);
    const statusCode = error.message.includes('Invalid partner code') || error.message.includes('do not have access') ? 403 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error fetching log by date',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getLogById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    let log = await Log.findOne({
      _id: id,
      user: userId
    }).lean();

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Log not found'
      });
    }

    await resolveCustomLogsForLog(log, userId);

    res.json({
      success: true,
      data: {
        log
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching log',
      error: error.message
    });
  }
};

export default { getLogs, getLogById, getLogByDate };
