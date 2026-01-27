import mongoose from 'mongoose';

const videoProgressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  video: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: true
  },
  currentPosition: {
    type: Number, // in seconds
    default: 0
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: Date,
  watchedDuration: {
    type: Number, // total seconds watched
    default: 0
  },
  lastWatched: {
    type: Date,
    default: Date.now
  },
  // For sequences
  currentPose: {
    poseIndex: Number,
    poseName: String,
    poseStartTime: Number
  }
}, {
  timestamps: true
});

// Index for efficient queries
videoProgressSchema.index({ user: 1, video: 1 }, { unique: true });
videoProgressSchema.index({ user: 1, lastWatched: -1 });

export default mongoose.model('VideoProgress', videoProgressSchema);
