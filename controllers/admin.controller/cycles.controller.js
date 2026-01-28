import Cycle from '../../models/Cycle.model.js';

export const getAdminCycles = async (req, res) => {
  try {
    const { page = 1, limit = 50, userId } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (userId) query.user = userId;

    const cycles = await Cycle.find(query)
      .populate('user', 'name email')
      .sort({ startDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Cycle.countDocuments(query);

    res.json({
      success: true,
      data: {
        cycles,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching cycles',
      error: error.message
    });
  }
};

export const deleteAdminCycle = async (req, res) => {
  try {
    const deleted = await Cycle.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Cycle not found' });
    }
    res.json({ success: true, message: 'Cycle deleted successfully' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting cycle',
      error: error.message
    });
  }
};

