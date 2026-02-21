import Log from '../../models/Log.model.js';
import User from '../../models/User.model.js';
import CustomLog from '../../models/CustomLog.model.js';
import { addPeriodDay, removePeriodDay } from '../../services/periodUpdate.service.js';
import { isValidObjectId } from '../../utils/validateObjectId.js';
import { resolveCustomLogsForLog } from '../../utils/resolveLogCustomLogs.js';
import { toUtcDateKey, toUtcMidnight, addDaysUtc, getUtcToday } from '../../utils/dateUtils.js';

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
  const today = getUtcToday();
  if (start.getTime() > today.getTime()) return;

  await User.findByIdAndUpdate(userId, {
    lastPeriodStart: start,
    lastPeriodEnd: end,
    periodLength: derivedPeriodLength
  });
};

/**
 * Validate and normalize customLogs from body: [{ customLogId, entryIds }, ...].
 * Ensures customLogId belongs to user and entryIds exist in that CustomLog.
 * Returns normalized array or throws.
 */
async function validateAndNormalizeCustomLogs(customLogsInput, userId) {
  if (customLogsInput === undefined || customLogsInput === null) return undefined;
  if (!Array.isArray(customLogsInput)) {
    throw new Error('customLogs must be an array');
  }
  if (customLogsInput.length === 0) return [];

  const normalized = [];
  for (const item of customLogsInput) {
    if (!item || !item.customLogId) continue;
    const customLogId = item.customLogId;
    if (!isValidObjectId(customLogId)) {
      throw new Error(`Invalid customLogId: ${customLogId}`);
    }
    const entryIds = Array.isArray(item.entryIds) ? item.entryIds : [];
    const validEntryIds = entryIds.filter((id) => id != null && isValidObjectId(id.toString()));

    const customLog = await CustomLog.findOne({ _id: customLogId, user: userId });
    if (!customLog) {
      throw new Error(`Custom log not found or access denied: ${customLogId}`);
    }
    const entryIdSet = new Set((customLog.log || []).map((e) => e._id.toString()));
    for (const eid of validEntryIds) {
      if (!entryIdSet.has(eid.toString())) {
        throw new Error(`Entry ${eid} not found in custom log ${customLogId}`);
      }
    }

    normalized.push({
      customLogId,
      entryIds: validEntryIds
    });
  }
  return normalized;
}

export const createLog = async (req, res) => {
  try {
    const userId = req.user._id;
    const { date, flow, flowIntensity, mood, symptoms, phase, temperature, notes, customLogs: customLogsInput } = req.body;

    const logDate = toUtcMidnight(date);
    const dayEnd = addDaysUtc(logDate, 1);

    let customLogs = await validateAndNormalizeCustomLogs(customLogsInput, userId);
    if (customLogs === undefined) customLogs = null; // leave existing unchanged when not sent

    // Check if log already exists for this date (same UTC day).
    const existingLog = await Log.findOne({
      user: userId,
      date: { $gte: logDate, $lt: dayEnd }
    });

    if (existingLog) {
      const prevPhase = existingLog.phase;
      Object.assign(existingLog, {
        flow: flow !== undefined ? flow : existingLog.flow,
        flowIntensity: flowIntensity !== undefined ? flowIntensity : existingLog.flowIntensity,
        mood: mood !== undefined ? mood : existingLog.mood,
        symptoms: symptoms !== undefined ? symptoms : existingLog.symptoms,
        phase: phase !== undefined ? phase : existingLog.phase,
        temperature: temperature !== undefined ? temperature : existingLog.temperature,
        notes: notes !== undefined ? notes : existingLog.notes,
        ...(customLogs !== null && { customLogs })
      });

      await existingLog.save();

      if (existingLog.phase === 'period') {
        await addPeriodDay(userId, logDate);
      } else if (prevPhase === 'period') {
        const removed = await removePeriodDay(userId, logDate);
        if (!removed.updated) await syncUserPeriodFromLogs(userId);
      }

      const out = existingLog.toObject ? existingLog.toObject() : { ...existingLog };
      await resolveCustomLogsForLog(out, userId);

      return res.json({
        success: true,
        message: 'Log updated successfully',
        data: { log: out }
      });
    }

    const customLogsToSave = customLogs && customLogs.length > 0 ? customLogs : [];
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
      customLogs: customLogsToSave
    });

    await log.save();

    if (phase === 'period') await addPeriodDay(userId, logDate);

    const out = log.toObject ? log.toObject() : { ...log };
    await resolveCustomLogsForLog(out, userId);

    res.status(201).json({
      success: true,
      message: 'Log created successfully',
      data: { log: out }
    });
  } catch (error) {
    console.error('Create log error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating log',
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
