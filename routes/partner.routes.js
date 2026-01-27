import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { generateShareCode, getMyPartnerCode, connectPartner, getSharedData, viewPartnerByCode } from '../controllers/partner.controller/share.controller.js';

const router = express.Router();

// Public route - view partner data by code (no auth required)
router.get('/view', viewPartnerByCode);

// Protected routes
router.use(authenticate);

router.get('/code', getMyPartnerCode); // Get current code
router.post('/code/regenerate', generateShareCode); // Generate new code
router.post('/connect', connectPartner);
router.get('/shared', getSharedData);

export default router;
