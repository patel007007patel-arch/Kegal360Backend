import CustomLog from '../../models/CustomLog.model.js';

export const createCustomLog = async (req, res) => {
  try {
    const { name, icon, icons } = req.body;
    const userId = req.user._id;

    const customLog = new CustomLog({
      user: userId,
      name,
      icon,
      icons: icons || []
    });

    await customLog.save();

    res.status(201).json({
      success: true,
      message: 'Custom log created successfully',
      data: {
        customLog
      }
    });
  } catch (error) {
    console.error('Create custom log error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating custom log',
      error: error.message
    });
  }
};

export default createCustomLog;
