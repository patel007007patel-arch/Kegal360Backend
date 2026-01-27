import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'number', 'select', 'multi-select', 'date', 'boolean'],
    required: true
  },
  options: [String], // For select/multi-select types
  order: {
    type: Number,
    required: true
  },
  isRequired: {
    type: Boolean,
    default: true
  },
  category: {
    type: String,
    enum: ['onboarding', 'cycle_setup', 'preferences'],
    default: 'onboarding'
  },
  validation: {
    min: Number,
    max: Number,
    pattern: String
  }
}, {
  timestamps: true
});

export default mongoose.model('Question', questionSchema);
