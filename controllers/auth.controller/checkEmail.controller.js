import User from '../../models/User.model.js';

/**
 * POST /auth/check-email
 * Check if a user's email is already registered.
 * Used to decide whether to navigate to Login or Register screen.
 */
export const checkEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail }).select('_id').lean();

    res.status(200).json({
      success: true,
      registered: !!existingUser
    });
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking email',
      error: error.message
    });
  }
};

export default checkEmail;
