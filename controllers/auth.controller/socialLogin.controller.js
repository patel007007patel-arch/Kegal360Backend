import User from '../../models/User.model.js';
import { generateToken } from '../../utils/jwt.js';

export const socialLogin = async (req, res) => {
  try {
    const { provider, providerId, email, name, profilePicture } = req.body;

    if (!provider || !providerId || !email) {
      return res.status(400).json({
        success: false,
        message: 'Provider, providerId, and email are required'
      });
    }

    let user;
    const socialField = provider === 'google' ? 'googleId' : 'appleId';

    // Find existing user
    user = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { [socialField]: providerId }
      ]
    });

    if (user) {
      // Update social login info if not set
      if (!user[socialField]) {
        user[socialField] = providerId;
        user.socialProvider = provider;
        if (profilePicture) user.profilePicture = profilePicture;
        await user.save();
      }
    } else {
      // Create new user
      user = new User({
        email: email.toLowerCase(),
        name,
        [socialField]: providerId,
        socialProvider: provider,
        profilePicture,
        onboardingCompleted: false
      });
      
      // Generate unique partner code automatically
      const partnerCode = await User.generateUniquePartnerCode();
      user.partnerCode = partnerCode;
      
      await user.save();
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id, user.role);

    res.json({
      success: true,
      message: 'Social login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          onboardingCompleted: user.onboardingCompleted,
          subscription: user.subscription
        },
        token
      }
    });
  } catch (error) {
    console.error('Social login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error with social login',
      error: error.message
    });
  }
};

export default socialLogin;
