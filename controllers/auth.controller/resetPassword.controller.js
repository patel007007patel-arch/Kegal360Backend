import User from '../../models/User.model.js';
import OtpToken from '../../models/OtpToken.model.js';

/**
 * POST /auth/reset-password
 * Body: { email, otp, newPassword }
 * Verifies OTP and sets new password. Clears OTP after success.
 */
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    if (!otp || typeof otp !== 'string' || !String(otp).trim()) {
      return res.status(400).json({
        success: false,
        message: 'OTP is required'
      });
    }
    if (!newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'New password is required'
      });
    }

    const trimmedPassword = newPassword.trim();
    if (trimmedPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    const normalEmail = email.toLowerCase().trim();
    const tokenDoc = await OtpToken.findOne({
      email: normalEmail,
      purpose: 'forgot_password',
      otp: String(otp).trim()
    });

    if (!tokenDoc) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP. Please request a new one.'
      });
    }

    if (new Date() > tokenDoc.expiresAt) {
      await OtpToken.deleteOne({ _id: tokenDoc._id });
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    const user = await User.findOne({ email: normalEmail }).select('+password');
    if (!user) {
      await OtpToken.deleteOne({ _id: tokenDoc._id });
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP. Please request a new one.'
      });
    }

    user.password = trimmedPassword;
    await user.save();

    await OtpToken.deleteMany({ email: normalEmail, purpose: 'forgot_password' });

    return res.json({
      success: true,
      message: 'Password has been reset successfully. You can log in with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Could not reset password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default resetPassword;
