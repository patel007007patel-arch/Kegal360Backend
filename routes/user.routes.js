import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import completeOnboarding from '../controllers/user.controller/onboarding.controller.js';
import { getProfile, updateProfile } from '../controllers/user.controller/profile.controller.js';
import deleteAccount from '../controllers/user.controller/deleteAccount.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Onboarding — app has static steps; only complete endpoint, sends answers in body, stored in User
router.post('/onboarding/complete', completeOnboarding);

// Profile
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Delete account and all user data
router.delete('/account', deleteAccount);

export default router;
