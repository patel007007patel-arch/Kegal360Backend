import express from 'express';
import register from '../controllers/auth.controller/register.controller.js';
import login from '../controllers/auth.controller/login.controller.js';
import socialLogin from '../controllers/auth.controller/socialLogin.controller.js';
import forgotPassword from '../controllers/auth.controller/forgotPassword.controller.js';
import resendOtp from '../controllers/auth.controller/resendOtp.controller.js';
import resetPassword from '../controllers/auth.controller/resetPassword.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Log all auth route requests
router.use((req, res, next) => {
  console.log(`🔐 Auth Route: ${req.method} ${req.path}`);
  next();
});

// Public routes
router.post('/register', register);
router.post('/login', (req, res, next) => {
  console.log('🔑 Login endpoint hit!');
  console.log('📧 Request body:', { email: req.body.email, password: '***' });
  login(req, res, next);
});
router.post('/social-login', socialLogin);

// Forgot password (request OTP)
router.post('/forgot-password', forgotPassword);
// Resend OTP (e.g. after forgot-password or for verification)
router.post('/resend-otp', resendOtp);
// Reset password with OTP
router.post('/reset-password', resetPassword);

// Protected route - get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: {
          id: req.user._id,
          email: req.user.email,
          name: req.user.name,
          role: req.user.role,
          onboardingCompleted: req.user.onboardingCompleted,
          subscription: req.user.subscription,
          settings: req.user.settings
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
});

export default router;
