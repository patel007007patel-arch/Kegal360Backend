import CustomLog from '../models/CustomLog.model.js';
import { getServerUrl } from './serverUrl.js';

const DEFAULT_MAIN_TITLE = 'CustomeLogs';

function toFullImageUrl(value) {
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  const base = getServerUrl();
  return value.startsWith('/') ? `${base}${value}` : `${base}/${value}`;
}

/**
 * Resolve customLogs (customLogId + entryIds) on a log document to full custom log + entries.
 * Mutates the object in place and returns it. Safe for lean() objects.
 * @param {Object} logDoc - Log document (plain or mongoose), must have customLogs array
 * @param {string} userId - Owner user id (for validation; CustomLog must belong to this user)
 * @returns {Promise<Object>} logDoc with customLogs resolved to { customLogId, mainTitle, entries: [{ id, logTitle, logimage }] }
 */
export async function resolveCustomLogsForLog(logDoc, userId) {
  const raw = logDoc.customLogs;
  if (!Array.isArray(raw) || raw.length === 0) {
    logDoc.customLogs = [];
    return logDoc;
  }

  const byRef = raw.filter((c) => c && c.customLogId && Array.isArray(c.entryIds));
  if (byRef.length === 0) {
    logDoc.customLogs = [];
    return logDoc;
  }

  const customLogIds = [...new Set(byRef.map((c) => c.customLogId.toString()))];
  const customLogs = await CustomLog.find({
    _id: { $in: customLogIds },
    user: userId
  }).lean();

  const map = new Map(customLogs.map((c) => [c._id.toString(), c]));

  logDoc.customLogs = byRef.map((ref) => {
    const customLog = map.get(ref.customLogId.toString());
    const mainTitle = customLog && customLog.customLogTitle && customLog.customLogTitle.trim()
      ? customLog.customLogTitle
      : DEFAULT_MAIN_TITLE;
    const entryIdSet = new Set((ref.entryIds || []).map((id) => id.toString()));
    const entries = (customLog && customLog.log) || [];
    const selected = entries
      .filter((e) => e._id && entryIdSet.has(e._id.toString()))
      .map((e) => ({
        id: e._id,
        logTitle: e.logTitle ?? '',
        logimage: toFullImageUrl(e.logimage)
      }));

    return {
      customLogId: ref.customLogId,
      mainTitle,
      entries: selected
    };
  });

  return logDoc;
}

/**
 * Resolve customLogs for multiple log documents (e.g. getLogs list).
 */
export async function resolveCustomLogsForLogs(logDocs, userId) {
  if (!Array.isArray(logDocs)) return logDocs;
  await Promise.all(logDocs.map((log) => resolveCustomLogsForLog(log, userId)));
  return logDocs;
}

export default resolveCustomLogsForLog;
