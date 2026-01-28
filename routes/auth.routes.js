import express from 'express';
import register from '../controllers/auth.controller/register.controller.js';
import login from '../controllers/auth.controller/login.controller.js';
import socialLogin from '../controllers/auth.controller/socialLogin.controller.js';
import forgotPassword from '../controllers/auth.controller/forgotPassword.controller.js';
import resendOtp from '../controllers/auth.controller/resendOtp.controller.js';
import resetPassword from '../controllers/auth.controller/resetPassword.controller.js';
import getMe from '../controllers/auth.controller/me.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authRouteLogger, loginRequestLogger } from '../middleware/authDebug.middleware.js';

const router = express.Router();

// Log all auth route requests (debug)
router.use(authRouteLogger);

// Public routes
router.post('/register', register);
router.post('/login', loginRequestLogger, login);
router.post('/social-login', socialLogin);

// Forgot password (request OTP)
router.post('/forgot-password', forgotPassword);
// Resend OTP (e.g. after forgot-password or for verification)
router.post('/resend-otp', resendOtp);
// Reset password with OTP
router.post('/reset-password', resetPassword);

// Protected route - get current user
router.get('/me', authenticate, getMe);

export default router;
