import Session from '../models/Session.model.js';
import Step from '../models/Step.model.js';
import Sequence from '../models/Sequence.model.js';
import CyclePhase from '../models/CyclePhase.model.js';
import UserProgress from '../models/UserProgress.model.js';
import Favorite from '../models/Favorite.model.js';

// Get sessions by cycle phase (for home/dashboard)
export const getSessionsByPhase = async (req, res) => {
  try {
    const { phase } = req.query;

    if (!phase) {
      return res.status(400).json({
        success: false,
        message: 'Phase parameter is required'
      });
    }

    // Find cycle phase
    const cyclePhase = await CyclePhase.findOne({ name: phase, isActive: true });
    if (!cyclePhase) {
      return res.status(404).json({
        success: false,
        message: 'Cycle phase not found'
      });
    }

    // Get sequences for this phase
    const sequences = await Sequence.find({
      cyclePhase: cyclePhase._id,
      isActive: true
    }).sort({ order: 1 });

    // Get sessions for each sequence
    const sessionsBySequence = await Promise.all(
      sequences.map(async (sequence) => {
        const sessions = await Session.find({
          sequence: sequence._id,
          isActive: true
        })
          .populate('sequence', 'name displayName')
          .sort({ order: 1 });

        return {
          sequence: {
            _id: sequence._id,
            name: sequence.name,
            displayName: sequence.displayName,
            description: sequence.description,
            thumbnail: sequence.thumbnail,
            totalDuration: sequence.totalDuration
          },
          sessions
        };
      })
    );

    res.json({
      success: true,
      data: {
        phase: {
          _id: cyclePhase._id,
          name: cyclePhase.name,
          displayName: cyclePhase.displayName
        },
        sequences: sessionsBySequence
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching sessions',
      error: error.message
    });
  }
};

// Get session details with steps
export const getSessionDetails = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('sequence', 'name displayName cyclePhase')
      .populate('sequence.cyclePhase', 'name displayName');

    if (!session || !session.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Get steps
    const steps = await Step.find({ session: session._id, isActive: true })
      .populate('media', 'title filePath thumbnail duration mediaType orientation')
      .populate('audio', 'title filePath duration')
      .sort({ order: 1 });

    // Get user progress if authenticated
    let userProgress = null;
    if (req.user) {
      userProgress = await UserProgress.findOne({
        user: req.user._id,
        session: session._id
      });
    }

    // Check if favorited
    let isFavorited = false;
    if (req.user) {
      const favorite = await Favorite.findOne({
        user: req.user._id,
        session: session._id
      });
      isFavorited = !!favorite;
    }

    res.json({
      success: true,
      data: {
        session,
        steps,
        userProgress,
        isFavorited
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching session details',
      error: error.message
    });
  }
};

// Get all sessions (with filters)
export const getAllSessions = async (req, res) => {
  try {
    const { sessionType, phase, search } = req.query;
    let query = { isActive: true };

    if (sessionType) query.sessionType = sessionType;

    let sessions = await Session.find(query)
      .populate({
        path: 'sequence',
        populate: {
          path: 'cyclePhase',
          match: phase ? { name: phase } : {}
        }
      })
      .sort({ createdAt: -1 });

    // Filter by phase if specified
    if (phase) {
      sessions = sessions.filter(s => s.sequence?.cyclePhase?.name === phase);
    }

    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase();
      sessions = sessions.filter(s =>
        s.title.toLowerCase().includes(searchLower) ||
        s.description?.toLowerCase().includes(searchLower)
      );
    }

    res.json({
      success: true,
      data: { sessions }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching sessions',
      error: error.message
    });
  }
};
