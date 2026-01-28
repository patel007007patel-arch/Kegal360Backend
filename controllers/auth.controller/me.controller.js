export const getMe = async (req, res) => {
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
};

export default getMe;

