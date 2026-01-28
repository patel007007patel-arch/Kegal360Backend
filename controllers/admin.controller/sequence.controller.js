import Sequence from '../../models/Sequence.model.js';
import Session from '../../models/Session.model.js';
import Step from '../../models/Step.model.js';

// Get all sequences
export const getAllSequences = async (req, res) => {
  try {
    const { cyclePhaseId, isActive } = req.query;
    let query = {};

    if (cyclePhaseId) query.cyclePhase = cyclePhaseId;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const sequences = await Sequence.find(query)
      .populate('cyclePhase', 'name displayName')
      .sort({ order: 1 });

    res.json({
      success: true,
      data: { sequences }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching sequences',
      error: error.message
    });
  }
};

// Get sequence by ID with sessions
export const getSequenceById = async (req, res) => {
  try {
    const sequence = await Sequence.findById(req.params.id)
      .populate('cyclePhase', 'name displayName');

    if (!sequence) {
      return res.status(404).json({
        success: false,
        message: 'Sequence not found'
      });
    }

    // Get sessions for this sequence
    const sessions = await Session.find({ sequence: sequence._id })
      .sort({ order: 1 });

    res.json({
      success: true,
      data: { sequence, sessions }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching sequence',
      error: error.message
    });
  }
};

// Create sequence
export const createSequence = async (req, res) => {
  try {
    const { cyclePhase, name, displayName, description, thumbnail, order, isActive } = req.body;

    const sequence = await Sequence.create({
      cyclePhase,
      name,
      displayName,
      description,
      thumbnail,
      order: order || 1,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Sequence created successfully',
      data: { sequence }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating sequence',
      error: error.message
    });
  }
};

// Update sequence
export const updateSequence = async (req, res) => {
  try {
    const { name, displayName, description, thumbnail, order, isActive } = req.body;

    const sequence = await Sequence.findByIdAndUpdate(
      req.params.id,
      {
        ...(name && { name }),
        ...(displayName && { displayName }),
        ...(description !== undefined && { description }),
        ...(thumbnail !== undefined && { thumbnail }),
        ...(order !== undefined && { order }),
        ...(isActive !== undefined && { isActive })
      },
      { new: true, runValidators: true }
    );

    if (!sequence) {
      return res.status(404).json({
        success: false,
        message: 'Sequence not found'
      });
    }

    // Recalculate total duration
    await recalculateSequenceDuration(sequence._id);

    res.json({
      success: true,
      message: 'Sequence updated successfully',
      data: { sequence }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating sequence',
      error: error.message
    });
  }
};

// Delete sequence
export const deleteSequence = async (req, res) => {
  try {
    const sequence = await Sequence.findById(req.params.id);
    if (!sequence) {
      return res.status(404).json({
        success: false,
        message: 'Sequence not found'
      });
    }

    // Delete all sessions and steps
    const sessions = await Session.find({ sequence: sequence._id });
    for (const session of sessions) {
      await Step.deleteMany({ session: session._id });
    }
    await Session.deleteMany({ sequence: sequence._id });
    await Sequence.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Sequence and all related sessions/steps deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting sequence',
      error: error.message
    });
  }
};

// Duplicate sequence (huge time saver)
export const duplicateSequence = async (req, res) => {
  try {
    const originalSequence = await Sequence.findById(req.params.id);
    if (!originalSequence) {
      return res.status(404).json({
        success: false,
        message: 'Sequence not found'
      });
    }

    // Create new sequence
    const newSequence = await Sequence.create({
      cyclePhase: originalSequence.cyclePhase,
      name: `${originalSequence.name} (Copy)`,
      displayName: `${originalSequence.displayName} (Copy)`,
      description: originalSequence.description,
      thumbnail: originalSequence.thumbnail,
      order: originalSequence.order + 1,
      isActive: false, // Set inactive by default
      createdBy: req.user._id
    });

    // Get all sessions
    const sessions = await Session.find({ sequence: originalSequence._id }).sort({ order: 1 });

    // Duplicate sessions and their steps
    for (const session of sessions) {
      const newSession = await Session.create({
        sequence: newSequence._id,
        sessionType: session.sessionType,
        title: session.title,
        description: session.description,
        benefits: session.benefits,
        thumbnail: session.thumbnail,
        difficulty: session.difficulty,
        equipment: session.equipment,
        order: session.order,
        isActive: false,
        createdBy: req.user._id
      });

      // Duplicate steps
      const steps = await Step.find({ session: session._id }).sort({ order: 1 });
      for (const step of steps) {
        await Step.create({
          session: newSession._id,
          title: step.title,
          instructions: step.instructions,
          media: step.media,
          audio: step.audio,
          timer: step.timer,
          restTime: step.restTime,
          order: step.order,
          isActive: step.isActive
        });
      }
    }

    // Recalculate duration
    await recalculateSequenceDuration(newSequence._id);

    res.status(201).json({
      success: true,
      message: 'Sequence duplicated successfully',
      data: { sequence: newSequence }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error duplicating sequence',
      error: error.message
    });
  }
};

// Reorder sequences (drag & drop)
export const reorderSequences = async (req, res) => {
  try {
    const { sequenceIds } = req.body; // Array of sequence IDs in new order

    if (!Array.isArray(sequenceIds)) {
      return res.status(400).json({
        success: false,
        message: 'sequenceIds must be an array'
      });
    }

    // Update order for each sequence
    const updatePromises = sequenceIds.map((id, index) =>
      Sequence.findByIdAndUpdate(id, { order: index + 1 })
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: 'Sequences reordered successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error reordering sequences',
      error: error.message
    });
  }
};

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
