import Step from '../models/Step.model.js';
import Session from '../models/Session.model.js';
import UserProgress from '../models/UserProgress.model.js';

// Get steps for a session (user-facing)
export const getStepsBySession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Verify session exists and is active
    const session = await Session.findById(sessionId);
    if (!session || !session.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Session not found or inactive'
      });
    }

    // Get all active steps for this session
    const steps = await Step.find({ 
      session: sessionId, 
      isActive: true 
    })
      .populate('media', 'title filePath thumbnail duration mediaType orientation')
      .populate('audio', 'title filePath duration mediaType')
      .sort({ order: 1 });

    // Get user progress for this session if authenticated
    let userProgress = null;
    let completedSteps = [];
    if (req.user) {
      userProgress = await UserProgress.findOne({
        user: req.user._id,
        session: sessionId
      });
      
      if (userProgress && userProgress.completedSteps) {
        completedSteps = userProgress.completedSteps.map(s => s.step.toString());
      }
    }

    // Add completion status to each step
    const stepsWithProgress = steps.map(step => ({
      ...step.toObject(),
      isCompleted: completedSteps.includes(step._id.toString())
    }));

    res.json({
      success: true,
      data: {
        session: {
          _id: session._id,
          title: session.title,
          description: session.description,
          thumbnail: session.thumbnail
        },
        steps: stepsWithProgress,
        totalSteps: steps.length,
        completedSteps: completedSteps.length,
        userProgress
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching steps',
      error: error.message
    });
  }
};

// Get a single step by ID (user-facing)
export const getStepById = async (req, res) => {
  try {
    const { stepId } = req.params;

    const step = await Step.findById(stepId)
      .populate('media', 'title filePath thumbnail duration mediaType orientation')
      .populate('audio', 'title filePath duration mediaType');

    if (!step || !step.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Step not found or inactive'
      });
    }

    // Verify session exists and is active
    const session = await Session.findById(step.session);
    if (!session || !session.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Session not found or inactive'
      });
    }

    // Get user progress for this step if authenticated
    let isCompleted = false;
    if (req.user) {
      const userProgress = await UserProgress.findOne({
        user: req.user._id,
        session: step.session,
        'completedSteps.step': step._id
      });
      isCompleted = !!userProgress;
    }

    res.json({
      success: true,
      data: {
        step: {
          ...step.toObject(),
          session: {
            _id: session._id,
            title: session.title,
            description: session.description,
            thumbnail: session.thumbnail
          },
          isCompleted
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching step',
      error: error.message
    });
  }
};
