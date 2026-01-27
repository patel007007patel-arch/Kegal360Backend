import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import createSubscription from '../controllers/subscription.controller/create.controller.js';
import { getSubscription, cancelSubscription } from '../controllers/subscription.controller/get.controller.js';

const router = express.Router();

router.use(authenticate);

router.post('/', createSubscription);
router.get('/', getSubscription);
router.post('/cancel', cancelSubscription);

export default router;
