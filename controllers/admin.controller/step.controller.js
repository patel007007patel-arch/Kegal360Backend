import Step from '../../models/Step.model.js';
import Session from '../../models/Session.model.js';
import Sequence from '../../models/Sequence.model.js';

// Get all steps
export const getAllSteps = async (req, res) => {
  try {
    const { sessionId } = req.query;
    let query = {};

    if (sessionId) query.session = sessionId;

    const steps = await Step.find(query)
      .populate('session', 'title sessionType')
      .populate('media', 'title filePath thumbnail duration')
      .populate('audio', 'title filePath duration')
      .sort({ order: 1 });

    res.json({
      success: true,
      data: { steps }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching steps',
      error: error.message
    });
  }
};

// Get step by ID
export const getStepById = async (req, res) => {
  try {
    const step = await Step.findById(req.params.id)
      .populate('session', 'title sessionType sequence')
      .populate('media', 'title filePath thumbnail duration mediaType')
      .populate('audio', 'title filePath duration');

    if (!step) {
      return res.status(404).json({
        success: false,
        message: 'Step not found'
      });
    }

    res.json({
      success: true,
      data: { step }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching step',
      error: error.message
    });
  }
};

// Create step
export const createStep = async (req, res) => {
  try {
    const {
      session,
      title,
      instructions,
      media,
      audio,
      timer,
      restTime,
      order,
      isActive
    } = req.body;

    const step = await Step.create({
      session,
      title,
      instructions,
      media,
      audio,
      timer: timer || 30,
      restTime: restTime || 0,
      order: order || 1,
      isActive: isActive !== undefined ? isActive : true
    });

    // Recalculate session and sequence duration
    const sessionDoc = await Session.findById(session);
    if (sessionDoc) {
      await recalculateSessionDuration(sessionDoc._id);
      const seq = await Sequence.findById(sessionDoc.sequence);
      if (seq) {
        await recalculateSequenceDuration(seq._id);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Step created successfully',
      data: { step }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating step',
      error: error.message
    });
  }
};

// Update step
export const updateStep = async (req, res) => {
  try {
    const {
      title,
      instructions,
      media,
      audio,
      timer,
      restTime,
      order,
      isActive
    } = req.body;

    const step = await Step.findByIdAndUpdate(
      req.params.id,
      {
        ...(title && { title }),
        ...(instructions !== undefined && { instructions }),
        ...(media && { media }),
        ...(audio !== undefined && { audio }),
        ...(timer !== undefined && { timer }),
        ...(restTime !== undefined && { restTime }),
        ...(order !== undefined && { order }),
        ...(isActive !== undefined && { isActive })
      },
      { new: true, runValidators: true }
    );

    if (!step) {
      return res.status(404).json({
        success: false,
        message: 'Step not found'
      });
    }

    // Recalculate session and sequence duration
    const sessionDoc = await Session.findById(step.session);
    if (sessionDoc) {
      await recalculateSessionDuration(sessionDoc._id);
      const seq = await Sequence.findById(sessionDoc.sequence);
      if (seq) {
        await recalculateSequenceDuration(seq._id);
      }
    }

    res.json({
      success: true,
      message: 'Step updated successfully',
      data: { step }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating step',
      error: error.message
    });
  }
};

// Delete step
export const deleteStep = async (req, res) => {
  try {
    const step = await Step.findById(req.params.id);
    if (!step) {
      return res.status(404).json({
        success: false,
        message: 'Step not found'
      });
    }

    const sessionId = step.session;
    await Step.findByIdAndDelete(req.params.id);

    // Recalculate session and sequence duration
    const sessionDoc = await Session.findById(sessionId);
    if (sessionDoc) {
      await recalculateSessionDuration(sessionDoc._id);
      const seq = await Sequence.findById(sessionDoc.sequence);
      if (seq) {
        await recalculateSequenceDuration(seq._id);
      }
    }

    res.json({
      success: true,
      message: 'Step deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting step',
      error: error.message
    });
  }
};

// Reorder steps (drag & drop)
export const reorderSteps = async (req, res) => {
  try {
    const { stepIds } = req.body; // Array of step IDs in new order

    if (!Array.isArray(stepIds)) {
      return res.status(400).json({
        success: false,
        message: 'stepIds must be an array'
      });
    }

    // Update order for each step
    const updatePromises = stepIds.map((id, index) =>
      Step.findByIdAndUpdate(id, { order: index + 1 })
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: 'Steps reordered successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error reordering steps',
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
