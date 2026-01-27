import User from '../../models/User.model.js';

/**
 * GET /api/cycles/settings
 * Returns cycle settings for Edit Mode (Regular / Irregular / Absent).
 * Used to pre-fill: cycle type, cycle length, period length, last period dates.
 */
export const getCycleSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      'cycleType trackCycle cycleLength cycleLengthRange periodLength lastPeriodStart lastPeriodEnd'
    );
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({
      success: true,
      data: {
        cycleType: user.cycleType || 'regular',
        trackCycle: user.trackCycle !== false,
        cycleLength: user.cycleLength ?? 28,
        cycleLengthRange: user.cycleLengthRange || null,
        periodLength: user.periodLength ?? 5,
        lastPeriodStart: user.lastPeriodStart || null,
        lastPeriodEnd: user.lastPeriodEnd || null
      }
    });
  } catch (error) {
    console.error('Get cycle settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cycle settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * PUT /api/cycles/settings
 * Saves cycle settings from Edit Mode.
 * Body: cycleType ('regular'|'irregular'|'absent'), trackCycle?, cycleLength?, cycleLengthRange?, periodLength?, lastPeriodStart?, lastPeriodEnd?
 * - Regular: cycleLength, periodLength, lastPeriodStart (calendar selection)
 * - Irregular: periodLength, lastPeriodStart
 * - Absent: trackCycle false (cycle tracking paused)
 */
export const updateCycleSettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      cycleType,
      trackCycle,
      cycleLength,
      cycleLengthRange,
      periodLength,
      lastPeriodStart,
      lastPeriodEnd
    } = req.body;

    const update = {};

    if (cycleType !== undefined) {
      if (!['regular', 'irregular', 'absent'].includes(cycleType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid cycleType. Use regular, irregular, or absent.'
        });
      }
      update.cycleType = cycleType;
    }

    if (trackCycle !== undefined) update.trackCycle = !!trackCycle;
    if (cycleType === 'absent') {
      update.trackCycle = false;
    }

    if (cycleLength !== undefined) {
      const n = parseInt(cycleLength, 10);
      if (n < 21 || n > 45) {
        return res.status(400).json({
          success: false,
          message: 'Cycle length must be between 21 and 45 days.'
        });
      }
      update.cycleLength = n;
    }

    if (cycleLengthRange !== undefined) {
      if (cycleLengthRange === null || cycleLengthRange === '') {
        update.cycleLengthRange = undefined;
      } else if (
        cycleLengthRange &&
        typeof cycleLengthRange.min === 'number' &&
        typeof cycleLengthRange.max === 'number'
      ) {
        update.cycleLengthRange = {
          min: cycleLengthRange.min,
          max: cycleLengthRange.max
        };
      }
    }

    if (periodLength !== undefined) {
      const n = parseInt(periodLength, 10);
      if (n < 1 || n > 14) {
        return res.status(400).json({
          success: false,
          message: 'Period length must be between 1 and 14 days.'
        });
      }
      update.periodLength = n;
    }

    if (lastPeriodStart !== undefined) {
      update.lastPeriodStart = lastPeriodStart ? new Date(lastPeriodStart) : null;
    }
    if (lastPeriodEnd !== undefined) {
      update.lastPeriodEnd = lastPeriodEnd ? new Date(lastPeriodEnd) : null;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      update,
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Cycle settings saved',
      data: {
        cycleType: user.cycleType,
        trackCycle: user.trackCycle,
        cycleLength: user.cycleLength,
        cycleLengthRange: user.cycleLengthRange,
        periodLength: user.periodLength ?? 5,
        lastPeriodStart: user.lastPeriodStart,
        lastPeriodEnd: user.lastPeriodEnd
      }
    });
  } catch (error) {
    console.error('Update cycle settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving cycle settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default { getCycleSettings, updateCycleSettings };
