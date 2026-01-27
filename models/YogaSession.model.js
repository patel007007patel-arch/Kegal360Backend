import mongoose from 'mongoose';

const yogaSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  video: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video'
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  duration: {
    type: Number, // in seconds
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  phase: {
    type: String,
    enum: ['menstrual', 'follicular', 'ovulation', 'luteal']
  }
}, {
  timestamps: true
});

// Index
yogaSessionSchema.index({ user: 1, date: -1 });

export default mongoose.model('YogaSession', yogaSessionSchema);
