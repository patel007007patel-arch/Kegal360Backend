import User from '../../models/User.model.js';
import OtpToken from '../../models/OtpToken.model.js';

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;

function generateOtp() {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < OTP_LENGTH; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

/**
 * POST /auth/forgot-password
 * Body: { email }
 * Sends/generates OTP for password reset. In development, OTP can be returned for testing.
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const normalEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalEmail });

    // Do not reveal if email exists or not (same response for both)
    const successResponse = {
      success: true,
      message: 'If an account exists with this email, you will receive an OTP to reset your password.'
    };

    if (!user) {
      return res.json(successResponse);
    }

    // User must have email-based login to reset password
    if (user.socialProvider && user.socialProvider !== 'email') {
      return res.json(successResponse);
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await OtpToken.deleteMany({ email: normalEmail, purpose: 'forgot_password' });
    await OtpToken.create({
      email: normalEmail,
      otp,
      purpose: 'forgot_password',
      expiresAt
    });

    // TODO: Send OTP via email (nodemailer). For now we only persist it.
    // In development, optional query ?dev=1 can return OTP for testing.
    if (process.env.NODE_ENV === 'development' && req.query.dev === '1') {
      return res.json({
        ...successResponse,
        developmentOnly: { otp, expiresAt: expiresAt.toISOString() }
      });
    }

    return res.json(successResponse);
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Could not process request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default forgotPassword;
