import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import createLog from '../controllers/cycle.controller/createLog.controller.js';
import { getLogs, getLogById, getLogByDate } from '../controllers/cycle.controller/getLogs.controller.js';

const router = express.Router();

router.use(authenticate);

router.post('/', createLog);
router.get('/', getLogs);
router.get('/by-date', getLogByDate); // must be before /:id
router.get('/:id', getLogById);

export default router;
