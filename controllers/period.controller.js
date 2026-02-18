import { addPeriodDay, removePeriodDay } from '../services/periodUpdate.service.js';

/**
 * POST /api/period/add
 * Add a period day (only updates User lastPeriodStart/End/periodLength; no logs).
 * Body: { date: "YYYY-MM-DD" }
 */
export const addPeriod = async (req, res) => {
  try {
    const userId = req.user._id;
    const date = req.body?.date;
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'date is required (YYYY-MM-DD)'
      });
    }

    const result = await addPeriodDay(userId, date);
    if (!result) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      message: 'Period day added (start/end updated)',
      data: {
        // lastPeriodStart: result.lastPeriodStart,
        // lastPeriodEnd: result.lastPeriodEnd,
        periodLength: result.periodLength
      }
    });
  } catch (error) {
    console.error('Add period error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error adding period day',
      error: error.message
    });
  }
};

/**
 * POST /api/period/remove
 * Remove a period day (only updates User lastPeriodStart/End/periodLength; no logs).
 * Body: { date: "YYYY-MM-DD" }
 */
export const removePeriod = async (req, res) => {
  try {
    const userId = req.user._id;
    const date = req.body?.date ?? req.query?.date;
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'date is required (YYYY-MM-DD). Use body or query: date'
      });
    }

    const result = await removePeriodDay(userId, date);
    if (!result) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      message: result.updated ? 'Period day removed (start/end updated)' : 'No change (date not at period start/end)',
      data: {
        // lastPeriodStart: result.lastPeriodStart ?? undefined,
        // lastPeriodEnd: result.lastPeriodEnd ?? undefined,
        periodLength: result.periodLength ?? undefined,
        updated: result.updated
      }
    });
  } catch (error) {
    console.error('Remove period error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error removing period day',
      error: error.message
    });
  }
};
