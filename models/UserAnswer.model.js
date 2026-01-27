import mongoose from 'mongoose';

const userAnswerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  answer: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  }
}, {
  timestamps: true
});

// Index
userAnswerSchema.index({ user: 1, question: 1 }, { unique: true });

export default mongoose.model('UserAnswer', userAnswerSchema);
