import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import createCustomLog from '../controllers/customLog.controller/create.controller.js';
import { getCustomLogs, getCustomLogById, updateCustomLog, deleteCustomLog } from '../controllers/customLog.controller/get.controller.js';

const router = express.Router();

router.use(authenticate);

router.post('/', createCustomLog);
router.get('/', getCustomLogs);
router.get('/:id', getCustomLogById);
router.put('/:id', updateCustomLog);
router.delete('/:id', deleteCustomLog);

export default router;
