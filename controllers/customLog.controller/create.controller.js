import CustomLog from '../../models/CustomLog.model.js';
import { getServerUrl } from '../../utils/serverUrl.js';

const LOG_IMAGE_PATH = '/uploads/custom-logs/';
const MAX_LOG_ENTRIES = 20;
const RESPONSE_MAIN_TITLE = 'CustomeLogs'; // only in response, not stored in DB

const getLogImageUrl = (filename) => `${getServerUrl()}${LOG_IMAGE_PATH}${filename}`;

/**
 * POST /api/custom-logs
 * Form-data: logTitle1, logimage1, logTitle2, logimage2, ...
 * One CustomLog per user: if exists, append new entries; else create. mainTitle not stored.
 */
export const createCustomLog = async (req, res) => {
  try {
    const userId = req.user._id;

    const newEntries = [];
    for (let i = 1; i <= MAX_LOG_ENTRIES; i++) {
      const title = req.body[`logTitle${i}`];
      const file = req.files && req.files[`logimage${i}`] && req.files[`logimage${i}`][0];
      if (title === undefined && !file) continue;
      newEntries.push({
        logTitle: title != null ? String(title).trim() : '',
        logimage: file ? getLogImageUrl(file.filename) : ''
      });
    }

    let customLog = await CustomLog.findOne({ user: userId });
    if (customLog) {
      customLog.log.push(...newEntries);
      await customLog.save();
    } else {
      customLog = new CustomLog({ user: userId, log: newEntries });
      await customLog.save();
    }

    res.status(201).json({
      success: true,
      message: 'Custom log created successfully',
      data: {
        mainTitle: RESPONSE_MAIN_TITLE,
        id: customLog._id,
        log: customLog.log.map((entry) => ({
          id: entry._id,
          logTitle: entry.logTitle,
          logimage: entry.logimage || ''
        }))
      }
    });
  } catch (error) {
    console.error('Create custom log error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating custom log',
      error: error.message
    });
  }
};

export default createCustomLog;
