import mongoose from 'mongoose';

const userProgressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true
  },
  sessionStarted: {
    type: Boolean,
    default: false
  },
  sessionStartedAt: {
    type: Date
  },
  sessionCompleted: {
    type: Boolean,
    default: false
  },
  sessionCompletedAt: {
    type: Date
  },
  timeSpent: {
    type: Number, // in seconds
    default: 0
  },
  lastStepIndex: {
    type: Number, // for resume functionality
    default: 0
  },
  completedSteps: [{
    step: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Step'
    },
    completedAt: {
      type: Date
    },
    timeSpent: {
      type: Number // in seconds
    }
  }]
}, {
  timestamps: true
});

// Index for efficient queries
userProgressSchema.index({ user: 1, session: 1 }, { unique: true });
userProgressSchema.index({ user: 1, sessionCompleted: 1 });
userProgressSchema.index({ session: 1 });

export default mongoose.model('UserProgress', userProgressSchema);
