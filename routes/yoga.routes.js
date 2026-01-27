import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import YogaSession from '../models/YogaSession.model.js';
import Video from '../models/Video.model.js';

const router = express.Router();

router.use(authenticate);

// Get yoga sessions
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

    const sessions = await YogaSession.find(query)
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
      message: 'Error fetching yoga sessions',
      error: error.message
    });
  }
});

// Create yoga session
router.post('/sessions', async (req, res) => {
  try {
    const { videoId, duration, completed, phase } = req.body;

    const session = new YogaSession({
      user: req.user._id,
      video: videoId,
      duration: parseInt(duration) || 0,
      completed: completed || false,
      phase
    });

    await session.save();

    res.status(201).json({
      success: true,
      message: 'Yoga session recorded',
      data: {
        session
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating yoga session',
      error: error.message
    });
  }
});

export default router;
