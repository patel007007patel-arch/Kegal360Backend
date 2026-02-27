import Session from '../../models/Session.model.js';
import Step from '../../models/Step.model.js';
import Sequence from '../../models/Sequence.model.js';
import { getServerUrl } from '../../utils/serverUrl.js';

// Get all sessions
export const getAllSessions = async (req, res) => {
  try {
    const { sequenceId, sessionType, isActive } = req.query;
    let query = {};

    if (sequenceId) query.sequence = sequenceId;
    if (sessionType) query.sessionType = sessionType;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const sessions = await Session.find(query)
      .populate('sequence', 'name displayName')
      .sort({ order: 1 });

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

// Get session by ID with steps
export const getSessionById = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('sequence', 'name displayName cyclePhase');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Get steps for this session
    const steps = await Step.find({ session: session._id })
      .populate('media', 'title filePath thumbnail duration')
      .populate('audio', 'title filePath duration')
      .sort({ order: 1 });

    res.json({
      success: true,
      data: { session, steps }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching session',
      error: error.message
    });
  }
};

// Create session
export const createSession = async (req, res) => {
  try {
    const {
      sequence,
      sessionType,
      title,
      description,
      benefits,
      thumbnail,
      difficulty,
      equipment,
      order,
      isActive,
      isFree
    } = req.body;

    // Prefer uploaded thumbnail file (same URL pattern as media library) if provided
    let thumbnailUrl = thumbnail;
    if (req.file && req.file.filename) {
      const base = getServerUrl();
      thumbnailUrl = `${base}/uploads/assets/thumbnails/${req.file.filename}`;
    }

    const session = await Session.create({
      sequence,
      sessionType,
      title,
      description,
      benefits: benefits || [],
      thumbnail: thumbnailUrl,
      difficulty: difficulty || 'beginner',
      equipment: equipment || 'Equipment-free',
      order: order || 1,
      isActive: isActive !== undefined ? isActive : true,
      isFree: isFree !== undefined ? isFree : true,
      createdBy: req.user._id
    });

    // Recalculate sequence duration
    const seq = await Sequence.findById(sequence);
    if (seq) {
      await recalculateSequenceDuration(seq._id);
    }

    res.status(201).json({
      success: true,
      message: 'Session created successfully',
      data: { session }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating session',
      error: error.message
    });
  }
};

// Update session
export const updateSession = async (req, res) => {
  try {
    const {
      title,
      description,
      benefits,
      thumbnail,
      difficulty,
      equipment,
      order,
      isActive,
      isFree
    } = req.body;

    // Build update payload, preferring uploaded thumbnail if present
    let thumbnailUrl = thumbnail;
    if (req.file && req.file.filename) {
      const base = getServerUrl();
      thumbnailUrl = `${base}/uploads/assets/thumbnails/${req.file.filename}`;
    }

    const updateData = {
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(benefits !== undefined && { benefits }),
      ...(difficulty && { difficulty }),
      ...(equipment !== undefined && { equipment }),
      ...(order !== undefined && { order }),
      ...(isActive !== undefined && { isActive }),
      ...(isFree !== undefined && { isFree })
    };

    if (thumbnailUrl !== undefined) {
      updateData.thumbnail = thumbnailUrl;
    }

    const session = await Session.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Recalculate session and sequence duration
    await recalculateSessionDuration(session._id);
    const seq = await Sequence.findById(session.sequence);
    if (seq) {
      await recalculateSequenceDuration(seq._id);
    }

    res.json({
      success: true,
      message: 'Session updated successfully',
      data: { session }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating session',
      error: error.message
    });
  }
};

// Delete session
export const deleteSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Delete all steps
    await Step.deleteMany({ session: session._id });
    await Session.findByIdAndDelete(req.params.id);

    // Recalculate sequence duration
    const seq = await Sequence.findById(session.sequence);
    if (seq) {
      await recalculateSequenceDuration(seq._id);
    }

    res.json({
      success: true,
      message: 'Session and all related steps deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting session',
      error: error.message
    });
  }
};

// Reorder sessions (drag & drop)
export const reorderSessions = async (req, res) => {
  try {
    const { sessionIds } = req.body; // Array of session IDs in new order

    if (!Array.isArray(sessionIds)) {
      return res.status(400).json({
        success: false,
        message: 'sessionIds must be an array'
      });
    }

    // Update order for each session
    const updatePromises = sessionIds.map((id, index) =>
      Session.findByIdAndUpdate(id, { order: index + 1 })
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: 'Sessions reordered successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error reordering sessions',
      error: error.message
    });
  }
};

// Helper function to recalculate session duration
async function recalculateSessionDuration(sessionId) {
  const steps = await Step.find({ session: sessionId });
  const duration = steps.reduce((sum, step) => sum + (step.timer || 0) + (step.restTime || 0), 0);
  await Session.findByIdAndUpdate(sessionId, { duration });
}

// Helper function to recalculate sequence duration
async function recalculateSequenceDuration(sequenceId) {
  const sessions = await Session.find({ sequence: sequenceId });
  let totalDuration = 0;

  for (const session of sessions) {
    const steps = await Step.find({ session: session._id });
    const sessionDuration = steps.reduce((sum, step) => sum + (step.timer || 0) + (step.restTime || 0), 0);
    await Session.findByIdAndUpdate(session._id, { duration: sessionDuration });
    totalDuration += sessionDuration;
  }

  await Sequence.findByIdAndUpdate(sequenceId, { totalDuration });
}
