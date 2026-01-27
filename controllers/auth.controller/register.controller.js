import User from '../../models/User.model.js';
import { generateToken } from '../../utils/jwt.js';
import Question from '../../models/Question.model.js';
import UserAnswer from '../../models/UserAnswer.model.js';

export const register = async (req, res) => {
  try {
    const { email, password, name, birthYear, appFor, socialProvider, socialId } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user
    const userData = {
      email: email.toLowerCase(),
      name,
      birthYear,
      appFor: appFor || 'myself',
      socialProvider: socialProvider || 'email',
      onboardingCompleted: false
    };

    if (password && !socialProvider) {
      userData.password = password;
    }

    if (socialProvider === 'google') {
      userData.googleId = socialId;
    } else if (socialProvider === 'apple') {
      userData.appleId = socialId;
    }

    const user = new User(userData);
    
    // Generate unique partner code automatically on registration
    const partnerCode = await User.generateUniquePartnerCode();
    user.partnerCode = partnerCode;
    
    await user.save();

    // Get onboarding questions
    const questions = await Question.find({ category: 'onboarding' }).sort({ order: 1 });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          onboardingCompleted: user.onboardingCompleted,
          partnerCode: user.partnerCode
        },
        token,
        questions
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message
    });
  }
};

export default register;
