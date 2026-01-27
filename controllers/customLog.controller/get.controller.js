import CustomLog from '../../models/CustomLog.model.js';

export const getCustomLogs = async (req, res) => {
  try {
    const userId = req.user._id;
    const { isActive } = req.query;

    let query = { user: userId };
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const customLogs = await CustomLog.find(query).sort({ order: 1, createdAt: 1 });

    res.json({
      success: true,
      data: {
        customLogs
      }
    });
  } catch (error) {
    console.error('Get custom logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching custom logs',
      error: error.message
    });
  }
};

export const getCustomLogById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const customLog = await CustomLog.findOne({
      _id: id,
      user: userId
    });

    if (!customLog) {
      return res.status(404).json({
        success: false,
        message: 'Custom log not found'
      });
    }

    res.json({
      success: true,
      data: {
        customLog
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching custom log',
      error: error.message
    });
  }
};

export const updateCustomLog = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { name, icon, icons, isActive, order } = req.body;

    const customLog = await CustomLog.findOneAndUpdate(
      { _id: id, user: userId },
      { name, icon, icons, isActive, order },
      { new: true }
    );

    if (!customLog) {
      return res.status(404).json({
        success: false,
        message: 'Custom log not found'
      });
    }

    res.json({
      success: true,
      message: 'Custom log updated successfully',
      data: {
        customLog
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating custom log',
      error: error.message
    });
  }
};

export const deleteCustomLog = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const customLog = await CustomLog.findOneAndDelete({
      _id: id,
      user: userId
    });

    if (!customLog) {
      return res.status(404).json({
        success: false,
        message: 'Custom log not found'
      });
    }

    res.json({
      success: true,
      message: 'Custom log deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting custom log',
      error: error.message
    });
  }
};

export default { getCustomLogs, getCustomLogById, updateCustomLog, deleteCustomLog };
