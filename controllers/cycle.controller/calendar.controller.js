import Log from '../../models/Log.model.js';
import Cycle from '../../models/Cycle.model.js';
import User from '../../models/User.model.js';

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

export const getCalendar = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { month, year, phase, type, partnerCode } = req.query; // type: mood, flow, notes

    // Resolve target user (self or partner)
    const { targetUserId, partnerInfo } = await resolvePartnerAccess(currentUserId, partnerCode);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    let query = {
      user: targetUserId,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    };

    if (phase && phase !== 'all') {
      // UI uses "Menstrual"; Log model stores phase as "period"
      query.phase = phase === 'menstrual' ? 'period' : phase;
    }

    const logs = await Log.find(query).sort({ date: 1 });

    // Get cycles for this period
    const cycles = await Cycle.find({
      user: targetUserId,
      startDate: { $lte: endDate },
      endDate: { $gte: startDate }
    });

    // Format calendar data
    const calendarData = logs.map(log => {
      const data = {
        date: log.date,
        phase: log.phase,
        hasLog: true
      };

      if (type === 'mood' && log.mood) {
        data.mood = log.mood;
      }
      if (type === 'flow' && log.flow) {
        data.flow = log.flow;
      }
      if (type === 'notes' && log.notes) {
        data.notes = log.notes;
      }

      return data;
    });

    res.json({
      success: true,
      data: {
        calendar: calendarData,
        cycles,
        month: parseInt(month),
        year: parseInt(year),
        ...(partnerInfo && { partner: partnerInfo })
      }
    });
  } catch (error) {
    console.error('Get calendar error:', error);
    const statusCode = error.message.includes('Invalid partner code') || error.message.includes('do not have access') ? 403 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error fetching calendar',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default getCalendar;
