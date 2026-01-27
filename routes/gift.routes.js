import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import createGiftSubscription from '../controllers/gift.controller/create.controller.js';
import redeemGiftSubscription from '../controllers/gift.controller/redeem.controller.js';
import { getMyGifts, getGiftById, getGiftsByCode } from '../controllers/gift.controller/get.controller.js';

const router = express.Router();

// Public routes - can gift without login
router.post('/', createGiftSubscription); // Can be called with or without auth
router.get('/by-code', getGiftsByCode);

// Protected routes
router.use(authenticate);

router.post('/redeem', redeemGiftSubscription);
router.get('/my-gifts', getMyGifts);
router.get('/:id', getGiftById);

export default router;
