import Log from '../../models/Log.model.js';

export const getLogs = async (req, res) => {
  try {
    const userId = req.user._id;
    const { startDate, endDate, phase, month, year } = req.query;

    let query = { user: userId };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      query.date = {
        $gte: start,
        $lte: end
      };
    }

    if (phase) {
      query.phase = phase;
    }

    const logs = await Log.find(query)
      .sort({ date: -1 })
      .lean();

    res.json({
      success: true,
      data: {
        logs,
        count: logs.length
      }
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching logs',
      error: error.message
    });
  }
};

export const getLogById = async (req, res) => {
  try {
    const { id } = req.params;
    const log = await Log.findOne({
      _id: id,
      user: req.user._id
    });

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Log not found'
      });
    }

    res.json({
      success: true,
      data: {
        log
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching log',
      error: error.message
    });
  }
};

export default { getLogs, getLogById };
