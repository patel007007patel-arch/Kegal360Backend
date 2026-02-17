import CustomLog from '../../models/CustomLog.model.js';
import { getServerUrl } from '../../utils/serverUrl.js';

const LOG_IMAGE_PATH = '/uploads/custom-logs/';
const MAX_LOG_ENTRIES = 20;
const DEFAULT_MAIN_TITLE = 'CustomeLogs'; // fallback when customLogTitle not set

const getLogImageUrl = (filename) => `${getServerUrl()}${LOG_IMAGE_PATH}${filename}`;

/**
 * POST /api/custom-logs
 * Form-data: customLogTitle (optional), logTitle1, logimage1, logTitle2, logimage2, ...
 * One CustomLog per user: if exists, append new entries (customLogTitle not overwritten); else create.
 * customLogTitle is saved only on first create; later POSTs do not overwrite it. User can update it via PUT.
 */
export const createCustomLog = async (req, res) => {
  try {
    const userId = req.user._id;
    const customLogTitleInput = req.body.customLogTitle ?? req.body.customeLogTitle;
    const customLogTitle = customLogTitleInput != null && String(customLogTitleInput).trim() !== ''
      ? String(customLogTitleInput).trim()
      : '';

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
      customLog = new CustomLog({
        user: userId,
        customLogTitle: customLogTitle || undefined,
        log: newEntries
      });
      await customLog.save();
    }

    const mainTitle = (customLog.customLogTitle && customLog.customLogTitle.trim()) ? customLog.customLogTitle : DEFAULT_MAIN_TITLE;
    res.status(201).json({
      success: true,
      message: 'Custom log created successfully',
      data: {
        mainTitle,
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
