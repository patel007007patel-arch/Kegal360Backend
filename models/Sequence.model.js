import mongoose from 'mongoose';

const sequenceSchema = new mongoose.Schema({
  cyclePhase: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CyclePhase',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  displayName: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  thumbnail: {
    type: String
  },
  order: {
    type: Number,
    required: true,
    default: 1
  },
  totalDuration: {
    type: Number, // in seconds, auto-calculated
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for efficient queries
sequenceSchema.index({ cyclePhase: 1, order: 1 });
sequenceSchema.index({ isActive: 1 });

export default mongoose.model('Sequence', sequenceSchema);
