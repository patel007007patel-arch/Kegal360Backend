import UserProgress from '../models/UserProgress.model.js';
import Session from '../models/Session.model.js';
import Step from '../models/Step.model.js';

// Start session
export const startSession = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    // Check if session exists
    const session = await Session.findById(sessionId);
    if (!session || !session.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Get or create user progress
    let userProgress = await UserProgress.findOne({
      user: req.user._id,
      session: sessionId
    });

    if (!userProgress) {
      userProgress = await UserProgress.create({
        user: req.user._id,
        session: sessionId,
        sessionStarted: true,
        sessionStartedAt: new Date(),
        lastStepIndex: 0
      });
    } else {
      userProgress.sessionStarted = true;
      userProgress.sessionStartedAt = new Date();
      await userProgress.save();
    }

    res.json({
      success: true,
      message: 'Session started',
      data: { userProgress }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error starting session',
      error: error.message
    });
  }
};

// Complete step
export const completeStep = async (req, res) => {
  try {
    const { sessionId, stepId, timeSpent } = req.body;

    if (!sessionId || !stepId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and Step ID are required'
      });
    }

    // Get user progress
    let userProgress = await UserProgress.findOne({
      user: req.user._id,
      session: sessionId
    });

    if (!userProgress) {
      // Create progress if doesn't exist
      userProgress = await UserProgress.create({
        user: req.user._id,
        session: sessionId,
        sessionStarted: true,
        sessionStartedAt: new Date(),
        lastStepIndex: 0
      });
    }

    // Check if step already completed
    const existingStep = userProgress.completedSteps.find(
      cs => cs.step.toString() === stepId
    );

    if (!existingStep) {
      // Add completed step
      userProgress.completedSteps.push({
        step: stepId,
        completedAt: new Date(),
        timeSpent: timeSpent || 0
      });

      // Update last step index
      const step = await Step.findById(stepId);
      if (step) {
        const allSteps = await Step.find({ session: sessionId }).sort({ order: 1 });
        const stepIndex = allSteps.findIndex(s => s._id.toString() === stepId);
        if (stepIndex > userProgress.lastStepIndex) {
          userProgress.lastStepIndex = stepIndex;
        }
      }

      // Update total time spent
      userProgress.timeSpent += (timeSpent || 0);
    }

    await userProgress.save();

    res.json({
      success: true,
      message: 'Step completed',
      data: { userProgress }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error completing step',
      error: error.message
    });
  }
};

// Complete session
export const completeSession = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    // Get user progress
    let userProgress = await UserProgress.findOne({
      user: req.user._id,
      session: sessionId
    });

    if (!userProgress) {
      return res.status(404).json({
        success: false,
        message: 'Session not started'
      });
    }

    userProgress.sessionCompleted = true;
    userProgress.sessionCompletedAt = new Date();
    await userProgress.save();

    res.json({
      success: true,
      message: 'Session completed',
      data: { userProgress }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error completing session',
      error: error.message
    });
  }
};

// Get user progress for a session
export const getSessionProgress = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const userProgress = await UserProgress.findOne({
      user: req.user._id,
      session: sessionId
    })
      .populate('session', 'title duration')
      .populate('completedSteps.step', 'title order');

    res.json({
      success: true,
      data: { userProgress }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching progress',
      error: error.message
    });
  }
};

// Get all user progress
export const getAllUserProgress = async (req, res) => {
  try {
    const { sessionType, completed } = req.query;
    let query = { user: req.user._id };

    if (completed !== undefined) {
      query.sessionCompleted = completed === 'true';
    }

    const progressList = await UserProgress.find(query)
      .populate({
        path: 'session',
        match: sessionType ? { sessionType } : {},
        populate: {
          path: 'sequence',
          populate: {
            path: 'cyclePhase'
          }
        }
      })
      .sort({ sessionCompletedAt: -1, sessionStartedAt: -1 });

    // Filter out null sessions (if sessionType filter removed them)
    const filteredProgress = progressList.filter(p => p.session !== null);

    res.json({
      success: true,
      data: { progress: filteredProgress }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching progress',
      error: error.message
    });
  }
};
