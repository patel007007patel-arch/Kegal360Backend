import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { completeOnboarding, getOnboardingQuestions } from '../controllers/user.controller/onboarding.controller.js';
import { getProfile, updateProfile } from '../controllers/user.controller/profile.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Onboarding
router.get('/onboarding/questions', getOnboardingQuestions);
router.post('/onboarding/complete', completeOnboarding);

// Profile
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

export default router;
