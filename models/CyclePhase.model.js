import mongoose from 'mongoose';

const cyclePhaseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['menstrual', 'follicular', 'ovulatory', 'luteal'],
    unique: true
  },
  displayName: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

export default mongoose.model('CyclePhase', cyclePhaseSchema);
