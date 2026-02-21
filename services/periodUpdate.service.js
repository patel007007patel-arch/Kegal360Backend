import User from '../models/User.model.js';
import { toUtcMidnight, addDaysUtc } from '../utils/dateUtils.js';

const getCycleLength = (user) => {
  if (user.cycleType === 'regular' && user.cycleLength) return user.cycleLength;
  if (user.cycleLengthRange?.min != null && user.cycleLengthRange?.max != null) {
    return Math.round((user.cycleLengthRange.min + user.cycleLengthRange.max) / 2);
  }
  return 28;
};

/**
 * Add a period day: extend lastPeriodStart or lastPeriodEnd by 1 (cycle-block logic).
 * Only updates User. No Log. Returns updated user period fields.
 */
export const addPeriodDay = async (userId, date) => {
  const user = await User.findById(userId).lean();
  if (!user) return null;

  const d = toUtcMidnight(date);
  const start = user.lastPeriodStart ? toUtcMidnight(user.lastPeriodStart) : null;
  const end = user.lastPeriodEnd ? toUtcMidnight(user.lastPeriodEnd) : null;
  const length = user.periodLength ?? 0;
  const cycleLength = getCycleLength(user);

  let newStart = start;
  let newEnd = end;
  let newLength = length;

  if (!start || !end) {
    newStart = d;
    newEnd = d;
    newLength = 1;
  } else {
    const dateMs = d.getTime();
    let isDayBeforeBlockStart = false;
    let isDayAfterBlockEnd = false;
    for (let k = -1; k <= 2; k++) {
      const blockStart = addDaysUtc(start, k * cycleLength);
      const blockEnd = addDaysUtc(end, k * cycleLength);
      if (dateMs >= blockStart.getTime() && dateMs <= blockEnd.getTime()) {
        return { lastPeriodStart: start, lastPeriodEnd: end, periodLength: length, updated: false };
      }
      if (dateMs === addDaysUtc(blockStart, -1).getTime()) isDayBeforeBlockStart = true;
      if (dateMs === addDaysUtc(blockEnd, 1).getTime()) isDayAfterBlockEnd = true;
    }
    if (isDayBeforeBlockStart) {
      newStart = addDaysUtc(start, -1);
      newLength = Math.min(14, length + 1);
    } else if (isDayAfterBlockEnd) {
      newEnd = addDaysUtc(end, 1);
      newLength = Math.min(14, length + 1);
    }
  }

  await User.findByIdAndUpdate(userId, {
    lastPeriodStart: newStart,
    lastPeriodEnd: newEnd,
    periodLength: newLength
  });

  return { lastPeriodStart: newStart, lastPeriodEnd: newEnd, periodLength: newLength, updated: true };
};

/**
 * Remove a period day: shrink lastPeriodStart or lastPeriodEnd by 1 (cycle-block logic).
 * Only updates User. No Log. Returns { updated: true, ... } if User was updated, { updated: false } otherwise.
 * When updated: false (middle day or no period), caller may sync from logs if needed.
 */
export const removePeriodDay = async (userId, date) => {
  const user = await User.findById(userId).lean();
  if (!user) return { updated: false };

  const d = toUtcMidnight(date);
  const start = user.lastPeriodStart ? toUtcMidnight(user.lastPeriodStart) : null;
  const end = user.lastPeriodEnd ? toUtcMidnight(user.lastPeriodEnd) : null;
  const length = user.periodLength ?? 0;
  const cycleLength = getCycleLength(user);

  if (!start || !end || length <= 1) {
    return { updated: false };
  }

  let isBlockStart = false;
  let isBlockEnd = false;
  const dateMs = d.getTime();
  for (let k = -1; k <= 2; k++) {
    const blockStart = addDaysUtc(start, k * cycleLength);
    const blockEnd = addDaysUtc(end, k * cycleLength);
    if (dateMs === blockStart.getTime()) isBlockStart = true;
    if (dateMs === blockEnd.getTime()) isBlockEnd = true;
  }

  if (isBlockStart) {
    const newStart = addDaysUtc(start, 1);
    await User.findByIdAndUpdate(userId, {
      lastPeriodStart: newStart,
      lastPeriodEnd: end,
      periodLength: Math.max(1, length - 1)
    });
    return { lastPeriodStart: newStart, lastPeriodEnd: end, periodLength: Math.max(1, length - 1), updated: true };
  }
  if (isBlockEnd) {
    const newEnd = addDaysUtc(end, -1);
    await User.findByIdAndUpdate(userId, {
      lastPeriodStart: start,
      lastPeriodEnd: newEnd,
      periodLength: Math.max(1, length - 1)
    });
    return { lastPeriodStart: start, lastPeriodEnd: newEnd, periodLength: Math.max(1, length - 1), updated: true };
  }

  return { updated: false };
};
