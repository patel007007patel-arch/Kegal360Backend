/**
 * Single date flow for the project: all log/calendar dates use UTC to avoid mismatches.
 * - Logs are stored with date = UTC midnight (e.g. 2025-05-05T00:00:00.000Z).
 * - Query ranges (day, month) use UTC boundaries.
 * - "Today" for hasLog / todayLog is the current UTC date.
 */

/** Normalize any date to UTC midnight (00:00:00.000Z). */
export const toUtcMidnight = (d) => {
  const t = new Date(d);
  t.setUTCHours(0, 0, 0, 0);
  return t;
};

/** Add n days in UTC. */
export const addDaysUtc = (d, n) => {
  const t = new Date(d);
  t.setUTCDate(t.getUTCDate() + n);
  return t;
};

/** Return YYYY-MM-DD for the given date in UTC (for matching and keys). Handles Date, ISO string, or any time on the day. */
export const toUtcDateKey = (d) => {
  if (d == null) return '';
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  const y = x.getUTCFullYear();
  const m = String(x.getUTCMonth() + 1).padStart(2, '0');
  const day = String(x.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * For a date string (YYYY-MM-DD) or Date, return the UTC day range.
 * start = that day 00:00:00.000Z, end = next day 00:00:00.000Z (exclusive).
 */
export const getUtcDayRange = (dateStrOrDate) => {
  const d = new Date(dateStrOrDate);
  const start = toUtcMidnight(d);
  const end = addDaysUtc(start, 1);
  return { start, end };
};

/**
 * Return UTC month range for the given year and month (1-12).
 * start = first day 00:00:00.000Z, end = last day 23:59:59.999Z.
 */
export const getUtcMonthRange = (year, month) => {
  const yearNum = parseInt(year, 10);
  const monthNum = parseInt(month, 10);
  const start = new Date(Date.UTC(yearNum, monthNum - 1, 1));
  const end = new Date(Date.UTC(yearNum, monthNum, 0, 23, 59, 59, 999));
  return { start, end };
};

/** "Today" in UTC (for hasLog / todayLog). */
export const getUtcToday = () => toUtcMidnight(Date.now());

export default {
  toUtcMidnight,
  addDaysUtc,
  toUtcDateKey,
  getUtcDayRange,
  getUtcMonthRange,
  getUtcToday
};
