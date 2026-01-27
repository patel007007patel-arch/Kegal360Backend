import User from '../../models/User.model.js';
import { generateToken } from '../../utils/jwt.js';

export const login = async (req, res) => {
  try {
    console.log('🚀 Login controller called!');
    console.log('📦 Request body:', { email: req.body?.email, hasPassword: !!req.body?.password });
    
    const { email, password } = req.body;

    console.log('🔐 Login attempt for email:', email);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user with password
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      console.log('❌ User not found:', email.toLowerCase());
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    console.log('✅ User found:', user.email, 'Role:', user.role);

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    console.log('🔑 Password validation:', isPasswordValid ? '✅ Valid' : '❌ Invalid');
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Wrong password. Try again'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id, user.role);

    res.json({
      success: true,
      message: 'Login successful',
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
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
};

export default login;
