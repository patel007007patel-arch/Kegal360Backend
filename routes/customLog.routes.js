import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireMultipart, uploadCustomLogCreate, uploadCustomLogSingleImage, uploadCustomLogBatchUpdate } from '../middleware/upload.middleware.js';
import createCustomLog from '../controllers/customLog.controller/create.controller.js';
import {
  getCustomLogs,
  getCustomLogById,
  updateCustomLog,
  updateCustomLogEntry,
  updateCustomLogEntries,
  deleteCustomLogEntry,
  deleteCustomLog
} from '../controllers/customLog.controller/get.controller.js';

const router = express.Router();

router.use(authenticate);

router.post('/', requireMultipart, uploadCustomLogCreate, createCustomLog);
router.get('/', getCustomLogs);
router.get('/:id', getCustomLogById);
router.put('/entries', requireMultipart, uploadCustomLogBatchUpdate, updateCustomLogEntries);
router.put('/entry/:entryId', requireMultipart, uploadCustomLogSingleImage, updateCustomLogEntry);
router.delete('/entry/:entryId', deleteCustomLogEntry);
router.put('/:id', requireMultipart, uploadCustomLogBatchUpdate, updateCustomLog);
router.delete('/:id', deleteCustomLog);

export default router;
