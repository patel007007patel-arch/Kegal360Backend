import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  // Menstrual flow
  flow: {
    type: String,
    enum: ['light', 'medium', 'heavy', 'spotting', null],
    default: null
  },
  // Flow intensity (A, B, C notation from images)
  flowIntensity: {
    type: String,
    enum: ['A', 'B', 'C', null],
    default: null
  },
  // Mood
  mood: [{
    type: String,
    enum: ['happy', 'energetic', 'calm', 'sleepy', 'anxious', 'sad', 'guilty', 'angry']
  }],
  // Symptoms
  symptoms: [{
    type: String,
    enum: ['fine', 'headache', 'cramps', 'cravings', 'acne', 'nausea', 'backache', 'bloating']
  }],
  // Phase adjustment
  phase: {
    type: String,
    enum: ['period', 'follicular', 'ovulation', 'luteal', 'missed', 'late', 'unsure', 'clear']
  },
  // Marked as period day via add-period API (only this field is set when adding/removing period day on existing log)
  isPeriod: {
    type: Boolean,
    default: false
  },
  // Temperature
  temperature: {
    value: Number,
    unit: {
      type: String,
      enum: ['celsius', 'fahrenheit'],
      default: 'fahrenheit'
    }
  },
  // Notes
  notes: String,
  // Custom logs: references to user's CustomLog documents and selected entry ids
  customLogs: [{
    customLogId: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomLog' },
    entryIds: [{ type: mongoose.Schema.Types.ObjectId }]
  }]
}, {
  timestamps: true
});

// Index for efficient queries
logSchema.index({ user: 1, date: -1 });
logSchema.index({ user: 1, date: 1 });

export default mongoose.model('Log', logSchema);
