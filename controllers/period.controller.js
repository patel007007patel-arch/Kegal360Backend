import { addPeriodDay, removePeriodDay } from '../services/periodUpdate.service.js';
import Log from '../models/Log.model.js';
import { getUtcDayRange, toUtcMidnight } from '../utils/dateUtils.js';

/**
 * POST /api/period/add
 * Add a period day: updates User (lastPeriodStart/End/periodLength) and creates/updates log.
 * - If log already exists: only set isPeriod: true (no other fields changed).
 * - If no log: create with date, flow, flowIntensity, phase: "period", isPeriod: true.
 * Body: { date: "YYYY-MM-DD", flow?: "medium", flowIntensity?: "B" }
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

    const { start, end } = getUtcDayRange(date);
    const logDate = toUtcMidnight(date);
    const flow = req.body?.flow ?? 'medium';
    const flowIntensity = req.body?.flowIntensity ?? 'B';

    let log = await Log.findOne({ user: userId, date: { $gte: start, $lt: end } });
    if (log) {
      log.isPeriod = true;
      await log.save();
    } else {
      log = new Log({
        user: userId,
        date: logDate,
        flow,
        flowIntensity,
        phase: 'period',
        isPeriod: true
      });
      await log.save();
    }

    return res.json({
      success: true,
      message: 'Period day added (start/end updated)',
      data: {
        periodLength: result.periodLength,
        log: log.toObject ? log.toObject() : { ...log }
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
 * Remove a period day: updates User (lastPeriodStart/End/periodLength) and sets
 * isPeriod: false on the log for that date (no other log fields changed).
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

    const { start, end } = getUtcDayRange(date);
    const log = await Log.findOne({ user: userId, date: { $gte: start, $lt: end } });
    if (log) {
      log.isPeriod = false;
      await log.save();
    }

    return res.json({
      success: true,
      message: result.updated ? 'Period day removed (start/end updated)' : 'No change (date not at period start/end)',
      data: {
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
