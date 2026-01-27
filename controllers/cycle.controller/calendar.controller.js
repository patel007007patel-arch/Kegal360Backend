import Log from '../../models/Log.model.js';
import Cycle from '../../models/Cycle.model.js';
import User from '../../models/User.model.js';

export const getCalendar = async (req, res) => {
  try {
    const userId = req.user._id;
    const { month, year, phase, type } = req.query; // type: mood, flow, notes

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    let query = {
      user: userId,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    };

    if (phase && phase !== 'all') {
      query.phase = phase;
    }

    const logs = await Log.find(query).sort({ date: 1 });

    // Get cycles for this period
    const cycles = await Cycle.find({
      user: userId,
      startDate: { $lte: endDate },
      endDate: { $gte: startDate }
    });

    // Format calendar data
    const calendarData = logs.map(log => {
      const data = {
        date: log.date,
        phase: log.phase,
        hasLog: true
      };

      if (type === 'mood' && log.mood) {
        data.mood = log.mood;
      }
      if (type === 'flow' && log.flow) {
        data.flow = log.flow;
      }
      if (type === 'notes' && log.notes) {
        data.notes = log.notes;
      }

      return data;
    });

    res.json({
      success: true,
      data: {
        calendar: calendarData,
        cycles,
        month: parseInt(month),
        year: parseInt(year)
      }
    });
  } catch (error) {
    console.error('Get calendar error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching calendar',
      error: error.message
    });
  }
};

export default getCalendar;
