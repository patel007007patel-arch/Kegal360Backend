import mongoose from 'mongoose';

const stepSchema = new mongoose.Schema({
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  instructions: {
    type: String
  },
  media: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Media',
    required: true
  },
  audio: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Media' // Optional audio file
  },
  timer: {
    type: Number, // in seconds
    required: true,
    default: 30
  },
  restTime: {
    type: Number, // in seconds, rest after this step
    default: 0
  },
  order: {
    type: Number,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
stepSchema.index({ session: 1, order: 1 });
stepSchema.index({ media: 1 });

export default mongoose.model('Step', stepSchema);
