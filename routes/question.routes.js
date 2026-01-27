import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import Question from '../models/Question.model.js';

const router = express.Router();

// Get all questions (public for onboarding)
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let query = {};
    if (category) query.category = category;

    const questions = await Question.find(query).sort({ order: 1 });

    res.json({
      success: true,
      data: {
        questions
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching questions',
      error: error.message
    });
  }
});

export default router;
