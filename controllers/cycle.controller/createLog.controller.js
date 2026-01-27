import Log from '../../models/Log.model.js';
import Cycle from '../../models/Cycle.model.js';
import User from '../../models/User.model.js';

export const createLog = async (req, res) => {
  try {
    const userId = req.user._id;
    const { date, flow, flowIntensity, mood, symptoms, phase, temperature, notes, customLogs } = req.body;

    // Check if log already exists for this date
    const existingLog = await Log.findOne({
      user: userId,
      date: new Date(date)
    });

    if (existingLog) {
      // Update existing log
      Object.assign(existingLog, {
        flow: flow !== undefined ? flow : existingLog.flow,
        flowIntensity: flowIntensity !== undefined ? flowIntensity : existingLog.flowIntensity,
        mood: mood !== undefined ? mood : existingLog.mood,
        symptoms: symptoms !== undefined ? symptoms : existingLog.symptoms,
        phase: phase !== undefined ? phase : existingLog.phase,
        temperature: temperature !== undefined ? temperature : existingLog.temperature,
        notes: notes !== undefined ? notes : existingLog.notes,
        customLogs: customLogs !== undefined ? customLogs : existingLog.customLogs
      });

      await existingLog.save();

      return res.json({
        success: true,
        message: 'Log updated successfully',
        data: {
          log: existingLog
        }
      });
    }

    // Create new log
    const log = new Log({
      user: userId,
      date: new Date(date),
      flow,
      flowIntensity,
      mood,
      symptoms,
      phase,
      temperature,
      notes,
      customLogs
    });

    await log.save();

    // Update cycle if phase is period
    if (phase === 'period') {
      await updateCycleFromLog(userId, new Date(date));
    }

    res.status(201).json({
      success: true,
      message: 'Log created successfully',
      data: {
        log
      }
    });
  } catch (error) {
    console.error('Create log error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating log',
      error: error.message
    });
  }
};

const updateCycleFromLog = async (userId, date) => {
  try {
    const user = await User.findById(userId);
    if (!user.lastPeriodStart || new Date(date) < new Date(user.lastPeriodStart)) {
      user.lastPeriodStart = date;
      await user.save();
    }
  } catch (error) {
    console.error('Error updating cycle from log:', error);
  }
};

export default createLog;
