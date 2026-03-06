import express from 'express';
import { handleRevenueCatWebhook } from '../controllers/webhook.controller.js';

const router = express.Router();

router.post('/revenuecat', handleRevenueCatWebhook);

export default router;
