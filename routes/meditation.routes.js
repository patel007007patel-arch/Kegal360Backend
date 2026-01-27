import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import MeditationSession from '../models/MeditationSession.model.js';

const router = express.Router();

router.use(authenticate);

// Get meditation sessions
router.get('/sessions', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = { user: req.user._id };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const sessions = await MeditationSession.find(query)
      .populate('video')
      .sort({ date: -1 });

    res.json({
      success: true,
      data: {
        sessions
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching meditation sessions',
      error: error.message
    });
  }
});

// Create meditation session
router.post('/sessions', async (req, res) => {
  try {
    const { videoId, duration, completed } = req.body;

    const session = new MeditationSession({
      user: req.user._id,
      video: videoId,
      duration: parseInt(duration) || 0,
      completed: completed || false
    });

    await session.save();

    res.status(201).json({
      success: true,
      message: 'Meditation session recorded',
      data: {
        session
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating meditation session',
      error: error.message
    });
  }
});

export default router;
