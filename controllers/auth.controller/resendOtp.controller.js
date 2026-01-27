import User from '../../models/User.model.js';
import OtpToken from '../../models/OtpToken.model.js';

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;

function generateOtp() {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < OTP_LENGTH; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

/**
 * POST /auth/resend-otp
 * Body: { email, purpose?: 'forgot_password' | 'email_verification' }
 * Resends OTP. Rate-limited by cooldown (e.g. 60s). Same semantics as forgot-password for forgot_password purpose.
 */
export const resendOtp = async (req, res) => {
  try {
    const { email, purpose = 'forgot_password' } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const normalEmail = email.toLowerCase().trim();

    const lastSent = await OtpToken.findOne({ email: normalEmail, purpose })
      .sort({ createdAt: -1 })
      .select('createdAt')
      .lean();

    if (lastSent && lastSent.createdAt) {
      const elapsed = (Date.now() - new Date(lastSent.createdAt).getTime()) / 1000;
      if (elapsed < RESEND_COOLDOWN_SECONDS) {
        const waitSeconds = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed);
        return res.status(429).json({
          success: false,
          message: `Please wait ${waitSeconds} seconds before requesting a new OTP.`,
          retryAfterSeconds: waitSeconds
        });
      }
    }

    const user = await User.findOne({ email: normalEmail });
    const successResponse = {
      success: true,
      message: 'If an account exists with this email, a new OTP has been sent.'
    };

    if (!user && purpose === 'forgot_password') {
      return res.json(successResponse);
    }

    if (user && user.socialProvider && user.socialProvider !== 'email' && purpose === 'forgot_password') {
      return res.json(successResponse);
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await OtpToken.deleteMany({ email: normalEmail, purpose });
    await OtpToken.create({
      email: normalEmail,
      otp,
      purpose,
      expiresAt
    });

    if (process.env.NODE_ENV === 'development' && req.query.dev === '1') {
      return res.json({
        ...successResponse,
        developmentOnly: { otp, expiresAt: expiresAt.toISOString() }
      });
    }

    return res.json(successResponse);
  } catch (error) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Could not resend OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default resendOtp;
