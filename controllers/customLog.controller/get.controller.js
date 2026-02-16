import CustomLog from '../../models/CustomLog.model.js';
import { getServerUrl } from '../../utils/serverUrl.js';

const RESPONSE_MAIN_TITLE = 'CustomeLogs'; // only in response, not stored
const LOG_IMAGE_PATH = '/uploads/custom-logs/';
const getLogImageUrl = (filename) => `${getServerUrl()}${LOG_IMAGE_PATH}${filename}`;
const toFullImageUrl = (value) => {
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return `${getServerUrl()}${value.startsWith('/') ? value : '/' + value}`;
};

const formatCustomLogResponse = (doc) => ({
  mainTitle: RESPONSE_MAIN_TITLE,
  log: (doc.log || []).map((entry) => ({
    id: entry._id,
    logTitle: entry.logTitle ?? '',
    logimage: toFullImageUrl(entry.logimage)
  }))
});

export const getCustomLogs = async (req, res) => {
  try {
    const userId = req.user._id;
    const customLog = await CustomLog.findOne({ user: userId });

    const data = customLog
      ? [{ id: customLog._id, ...formatCustomLogResponse(customLog) }]
      : [];

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get custom logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching custom logs',
      error: error.message
    });
  }
};

export const getCustomLogById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const customLog = await CustomLog.findOne({
      _id: id,
      user: userId
    });

    if (!customLog) {
      return res.status(404).json({
        success: false,
        message: 'Custom log not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: customLog._id,
        ...formatCustomLogResponse(customLog)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching custom log',
      error: error.message
    });
  }
};

/**
 * PUT /api/custom-logs/:id
 * Form-data: log (JSON string array), logimage (files). Updates whole log array. mainTitle not stored.
 */
export const updateCustomLog = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const customLog = await CustomLog.findOne({ _id: id, user: userId });
    if (!customLog) {
      return res.status(404).json({
        success: false,
        message: 'Custom log not found'
      });
    }

    if (req.body.log !== undefined && typeof req.body.log === 'string') {
      try {
        const parsed = JSON.parse(req.body.log);
        if (Array.isArray(parsed)) {
          customLog.log = parsed.map((entry) => ({
            logTitle: entry && typeof entry.logTitle !== 'undefined' ? String(entry.logTitle) : '',
            logimage: (entry && entry.logimage) ? String(entry.logimage) : ''
          }));
        }
      } catch (_) {
        // keep existing log if invalid JSON
      }
    }

    const files = req.files || [];
    for (let i = 0; i < customLog.log.length && i < files.length; i++) {
      customLog.log[i].logimage = getLogImageUrl(files[i].filename);
    }

    await customLog.save();

    res.json({
      success: true,
      message: 'Custom log updated successfully',
      data: {
        id: customLog._id,
        ...formatCustomLogResponse(customLog)
      }
    });
  } catch (error) {
    console.error('Update custom log error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating custom log',
      error: error.message
    });
  }
};

/**
 * PUT /api/custom-logs/entry/:entryId
 * Update a single log entry by its _id. Form-data: logTitle, logimage (file optional).
 */
export const updateCustomLogEntry = async (req, res) => {
  try {
    const { entryId } = req.params;
    const userId = req.user._id;

    const customLog = await CustomLog.findOne({ user: userId });
    if (!customLog) {
      return res.status(404).json({
        success: false,
        message: 'Custom log not found'
      });
    }

    const entry = customLog.log.id(entryId);
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Log entry not found'
      });
    }

    if (req.body.logTitle !== undefined) {
      entry.logTitle = String(req.body.logTitle).trim();
    }
    const file = req.file || (req.files && req.files.logimage && req.files.logimage[0]);
    if (file) {
      entry.logimage = getLogImageUrl(file.filename);
    }

    await customLog.save();

    res.json({
      success: true,
      message: 'Log entry updated successfully',
      data: {
        mainTitle: RESPONSE_MAIN_TITLE,
        entry: {
          id: entry._id,
          logTitle: entry.logTitle,
          logimage: entry.logimage || ''
        }
      }
    });
  } catch (error) {
    console.error('Update log entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating log entry',
      error: error.message
    });
  }
};

const MAX_ENTRIES_BATCH = 20;

/**
 * PUT /api/custom-logs/entries
 * Update multiple entries at once. Form-data only (no JSON): entryId1, logTitle1, logimage1, entryId2, logTitle2, logimage2, ...
 */
export const updateCustomLogEntries = async (req, res) => {
  try {
    const userId = req.user._id;
    const customLog = await CustomLog.findOne({ user: userId });
    if (!customLog) {
      return res.status(404).json({
        success: false,
        message: 'Custom log not found'
      });
    }

    const updatedEntries = [];
    for (let i = 1; i <= MAX_ENTRIES_BATCH; i++) {
      const entryId = req.body[`entryId${i}`];
      if (entryId === undefined) continue;

      const entry = customLog.log.id(entryId);
      if (!entry) continue;

      const title = req.body[`logTitle${i}`];
      if (title !== undefined) {
        entry.logTitle = String(title).trim();
      }
      const file = req.files && req.files[`logimage${i}`] && req.files[`logimage${i}`][0];
      if (file) {
        entry.logimage = getLogImageUrl(file.filename);
      }

      updatedEntries.push({
        id: entry._id,
        logTitle: entry.logTitle,
        logimage: toFullImageUrl(entry.logimage)
      });
    }

    if (updatedEntries.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Send at least one entryId1, entryId2, ... to update'
      });
    }

    await customLog.save();

    res.json({
      success: true,
      message: 'Log entries updated successfully',
      data: {
        mainTitle: RESPONSE_MAIN_TITLE,
        updated: updatedEntries
      }
    });
  } catch (error) {
    console.error('Update log entries (batch) error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating log entries',
      error: error.message
    });
  }
};

/**
 * DELETE /api/custom-logs/entry/:entryId
 * Remove one log entry by its _id.
 */
export const deleteCustomLogEntry = async (req, res) => {
  try {
    const { entryId } = req.params;
    const userId = req.user._id;

    const customLog = await CustomLog.findOne({ user: userId });
    if (!customLog) {
      return res.status(404).json({
        success: false,
        message: 'Custom log not found'
      });
    }

    const entry = customLog.log.id(entryId);
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Log entry not found'
      });
    }

    customLog.log.pull(entryId);
    await customLog.save();

    res.json({
      success: true,
      message: 'Log entry deleted successfully'
    });
  } catch (error) {
    console.error('Delete log entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting log entry',
      error: error.message
    });
  }
};

export const deleteCustomLog = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const customLog = await CustomLog.findOneAndDelete({
      _id: id,
      user: userId
    });

    if (!customLog) {
      return res.status(404).json({
        success: false,
        message: 'Custom log not found'
      });
    }

    res.json({
      success: true,
      message: 'Custom log deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting custom log',
      error: error.message
    });
  }
};

export default {
  getCustomLogs,
  getCustomLogById,
  updateCustomLog,
  updateCustomLogEntry,
  updateCustomLogEntries,
  deleteCustomLogEntry,
  deleteCustomLog
};
