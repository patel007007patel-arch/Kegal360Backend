import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  sequence: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sequence',
    required: true
  },
  sessionType: {
    type: String,
    required: true,
    enum: ['yoga', 'workout', 'meditation', 'breathwork']
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  benefits: [{
    type: String
  }],
  thumbnail: {
    type: String
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  duration: {
    type: Number, // in seconds, auto-calculated from steps
    default: 0
  },
  equipment: {
    type: String,
    default: 'Equipment-free'
  },
  order: {
    type: Number,
    required: true,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFree: {
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
sessionSchema.index({ sequence: 1, order: 1 });
sessionSchema.index({ sessionType: 1 });
sessionSchema.index({ isActive: 1 });
sessionSchema.index({ isFree: 1 });

export default mongoose.model('Session', sessionSchema);
