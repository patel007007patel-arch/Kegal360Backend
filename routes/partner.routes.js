import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { generateShareCode, getMyPartnerCode, connectPartner, getSharedData, getPartnerCalendarEnhanced, disconnectPartner, viewPartnerByCode, purchaseSubscriptionForPartner } from '../controllers/partner.controller/share.controller.js';

const router = express.Router();

// Public: view partner profile + cycle by code (partner opens page with code)
router.get('/view', viewPartnerByCode);

// Protected
router.use(authenticate);

router.get('/code', getMyPartnerCode);
router.post('/code/regenerate', generateShareCode);
router.post('/connect', connectPartner);
router.get('/shared', getSharedData);
router.get('/calendar/enhanced', getPartnerCalendarEnhanced);
router.post('/disconnect', disconnectPartner);
// Gift subscription: payer buys subscription for the user who owns the code (from partner view page)
router.post('/gift-subscription', purchaseSubscriptionForPartner);

export default router;
