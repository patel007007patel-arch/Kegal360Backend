import CyclePhase from '../../models/CyclePhase.model.js';

// Get all cycle phases
export const getAllCyclePhases = async (req, res) => {
  try {
    const cyclePhases = await CyclePhase.find().sort({ order: 1 });
    res.json({
      success: true,
      data: { cyclePhases }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching cycle phases',
      error: error.message
    });
  }
};

// Get cycle phase by ID
export const getCyclePhaseById = async (req, res) => {
  try {
    const cyclePhase = await CyclePhase.findById(req.params.id);
    if (!cyclePhase) {
      return res.status(404).json({
        success: false,
        message: 'Cycle phase not found'
      });
    }
    res.json({
      success: true,
      data: { cyclePhase }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching cycle phase',
      error: error.message
    });
  }
};

// Create cycle phase
export const createCyclePhase = async (req, res) => {
  try {
    const { name, displayName, description, isActive, order } = req.body;

    // Check if cycle phase with same name exists
    const existing = await CyclePhase.findOne({ name });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Cycle phase with this name already exists'
      });
    }

    const cyclePhase = await CyclePhase.create({
      name,
      displayName,
      description,
      isActive: isActive !== undefined ? isActive : true,
      order: order || 0
    });

    res.status(201).json({
      success: true,
      message: 'Cycle phase created successfully',
      data: { cyclePhase }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating cycle phase',
      error: error.message
    });
  }
};

// Update cycle phase
export const updateCyclePhase = async (req, res) => {
  try {
    const { displayName, description, isActive, order } = req.body;

    const cyclePhase = await CyclePhase.findByIdAndUpdate(
      req.params.id,
      {
        ...(displayName && { displayName }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
        ...(order !== undefined && { order })
      },
      { new: true, runValidators: true }
    );

    if (!cyclePhase) {
      return res.status(404).json({
        success: false,
        message: 'Cycle phase not found'
      });
    }

    res.json({
      success: true,
      message: 'Cycle phase updated successfully',
      data: { cyclePhase }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating cycle phase',
      error: error.message
    });
  }
};

// Delete cycle phase
export const deleteCyclePhase = async (req, res) => {
  try {
    const cyclePhase = await CyclePhase.findByIdAndDelete(req.params.id);
    if (!cyclePhase) {
      return res.status(404).json({
        success: false,
        message: 'Cycle phase not found'
      });
    }

    res.json({
      success: true,
      message: 'Cycle phase deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting cycle phase',
      error: error.message
    });
  }
};
