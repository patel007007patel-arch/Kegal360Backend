import Log from '../../models/Log.model.js';

export const getAdminLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, userId, phase, flow, mood, symptom, dateFrom, dateTo } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (userId) query.user = userId;
    if (phase) query.phase = phase;
    if (flow) query.flow = flow;
    if (mood) query.mood = { $in: [mood] };
    if (symptom) query.symptoms = { $in: [symptom] };

    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo) query.date.$lte = new Date(dateTo);
    }

    const logs = await Log.find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Log.countDocuments(query);

    res.json({
      success: true,
      data: {
        logs,
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
      message: 'Error fetching logs',
      error: error.message
    });
  }
};

export const deleteAdminLog = async (req, res) => {
  try {
    const deleted = await Log.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Log not found' });
    }
    res.json({ success: true, message: 'Log deleted successfully' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting log',
      error: error.message
    });
  }
};

