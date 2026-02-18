import Log from '../../models/Log.model.js';
import User from '../../models/User.model.js';
import { addPeriodDay, removePeriodDay } from '../../services/periodUpdate.service.js';

const toUtcDateKey = (d) => new Date(d).toISOString().slice(0, 10); // YYYY-MM-DD

/** Normalize to UTC midnight (date-only). */
const toUtcMidnight = (d) => {
  const t = new Date(d);
  t.setUTCHours(0, 0, 0, 0);
  return t;
};

/** Add n days in UTC. */
const addDaysUtc = (d, n) => {
  const t = new Date(d);
  t.setUTCDate(t.getUTCDate() + n);
  return t;
};

/**
 * Keep user.lastPeriodStart/End + periodLength in sync with period logs.
 * Used when REMOVING a period day (recompute from remaining logs).
 * This allows the UI to add/remove period days and have predictions update correctly.
 *
 * Strategy:
 * - Find the most recent log with phase='period'
 * - Build the contiguous block of period days around that date
 * - Save lastPeriodStart/End and derived periodLength (clamped 1–14)
 */
const syncUserPeriodFromLogs = async (userId) => {
  const latest = await Log.findOne({ user: userId, phase: 'period' })
    .sort({ date: -1 })
    .lean();

  // If user has no period logs, don't auto-clear settings.
  if (!latest) return;

  const latestDate = new Date(latest.date);
  latestDate.setUTCHours(0, 0, 0, 0);

  // Fetch a window of period logs around the latest period day.
  const windowStart = new Date(latestDate);
  windowStart.setUTCDate(windowStart.getUTCDate() - 60);
  const windowEnd = new Date(latestDate);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + 30);

  const periodLogs = await Log.find({
    user: userId,
    phase: 'period',
    date: { $gte: windowStart, $lte: windowEnd }
  })
    .sort({ date: 1 })
    .lean();

  const daySet = new Set(periodLogs.map((l) => toUtcDateKey(l.date)));

  const start = new Date(latestDate);
  while (true) {
    const prev = new Date(start);
    prev.setUTCDate(prev.getUTCDate() - 1);
    if (!daySet.has(toUtcDateKey(prev))) break;
    start.setUTCDate(start.getUTCDate() - 1);
  }

  const end = new Date(latestDate);
  while (true) {
    const next = new Date(end);
    next.setUTCDate(next.getUTCDate() + 1);
    if (!daySet.has(toUtcDateKey(next))) break;
    end.setUTCDate(end.getUTCDate() + 1);
  }

  const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
  const derivedPeriodLength = Math.max(1, Math.min(14, diffDays + 1));

  // Don't overwrite User with a period that starts in the future.
  const today = toUtcMidnight(Date.now());
  if (start.getTime() > today.getTime()) return;

  await User.findByIdAndUpdate(userId, {
    lastPeriodStart: start,
    lastPeriodEnd: end,
    periodLength: derivedPeriodLength
  });
};

export const createLog = async (req, res) => {
  try {
    const userId = req.user._id;
    const { date, flow, flowIntensity, mood, symptoms, phase, temperature, notes, customLogs } = req.body;

    const logDate = toUtcMidnight(date);
    const dayEnd = addDaysUtc(logDate, 1);

    // Check if log already exists for this date (same UTC day).
    const existingLog = await Log.findOne({
      user: userId,
      date: { $gte: logDate, $lt: dayEnd }
    });

    if (existingLog) {
      const prevPhase = existingLog.phase;
      // Update existing log
      Object.assign(existingLog, {
        flow: flow !== undefined ? flow : existingLog.flow,
        flowIntensity: flowIntensity !== undefined ? flowIntensity : existingLog.flowIntensity,
        mood: mood !== undefined ? mood : existingLog.mood,
        symptoms: symptoms !== undefined ? symptoms : existingLog.symptoms,
        phase: phase !== undefined ? phase : existingLog.phase,
        temperature: temperature !== undefined ? temperature : existingLog.temperature,
        notes: notes !== undefined ? notes : existingLog.notes,
        customLogs: customLogs !== undefined ? customLogs : existingLog.customLogs
      });

      await existingLog.save();

      // Period changed: ADD/REMOVE use same logic as /api/period (service). If remove and not at block start/end, sync from logs.
      if (existingLog.phase === 'period') {
        await addPeriodDay(userId, logDate);
      } else if (prevPhase === 'period') {
        const removed = await removePeriodDay(userId, logDate);
        if (!removed.updated) await syncUserPeriodFromLogs(userId);
      }

      return res.json({
        success: true,
        message: 'Log updated successfully',
        data: {
          log: existingLog
        }
      });
    }

    // Create new log (store date as UTC midnight).
    const log = new Log({
      user: userId,
      date: logDate,
      flow,
      flowIntensity,
      mood,
      symptoms,
      phase,
      temperature,
      notes,
      customLogs
    });

    await log.save();

    // If this is a period day: same logic as POST /api/period/add (only User updated).
    if (phase === 'period') await addPeriodDay(userId, logDate);

    res.status(201).json({
      success: true,
      message: 'Log created successfully',
      data: {
        log
      }
    });
  } catch (error) {
    console.error('Create log error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating log',
      error: error.message
    });
  }
};

const updateCycleFromLog = async (userId, date) => {
  try {
    const user = await User.findById(userId);
    if (!user.lastPeriodStart || new Date(date) < new Date(user.lastPeriodStart)) {
      user.lastPeriodStart = date;
      await user.save();
    }
  } catch (error) {
    console.error('Error updating cycle from log:', error);
  }
};

export default createLog;
