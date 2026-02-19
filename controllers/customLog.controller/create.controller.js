import CustomLog from '../../models/CustomLog.model.js';
import { getServerUrl } from '../../utils/serverUrl.js';

const LOG_IMAGE_PATH = '/uploads/custom-logs/';
const MAX_LOG_ENTRIES = 20;
const MAX_CUSTOM_LOG_TITLE_LENGTH = 200;
const MAX_ENTRY_TITLE_LENGTH = 500;
const DEFAULT_MAIN_TITLE = 'CustomeLogs'; // fallback when customLogTitle not set

const getLogImageUrl = (filename) => `${getServerUrl()}${LOG_IMAGE_PATH}${filename}`;

/**
 * POST /api/custom-logs
 * Form-data: customLogTitle (optional), logTitle1, logimage1, logTitle2, logimage2, ...
 * Always creates a NEW custom log object (new document) with its own list. Each user can have many.
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
      const entryTitle = title != null ? String(title).trim() : '';
      if (entryTitle.length > MAX_ENTRY_TITLE_LENGTH) {
        return res.status(400).json({
          success: false,
          message: `logTitle${i} must be at most ${MAX_ENTRY_TITLE_LENGTH} characters`
        });
      }
      newEntries.push({
        logTitle: entryTitle,
        logimage: file ? getLogImageUrl(file.filename) : ''
      });
    }

    const customLog = new CustomLog({
      user: userId,
      customLogTitle: customLogTitle || undefined,
      log: newEntries.length ? newEntries : []
    });
    await customLog.save();

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
