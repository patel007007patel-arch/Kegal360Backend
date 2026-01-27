import mongoose from 'mongoose';

const cycleSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cycleNumber: {
    type: Number,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: Date,
  periodStartDate: {
    type: Date,
    required: true
  },
  periodEndDate: Date,
  cycleLength: {
    type: Number,
    required: true
  },
  periodLength: {
    type: Number,
    default: 5
  },
  ovulationDate: Date,
  fertileWindowStart: Date,
  fertileWindowEnd: Date,
  phase: {
    type: String,
    enum: ['menstrual', 'follicular', 'ovulation', 'luteal'],
    required: true
  },
  isPredicted: {
    type: Boolean,
    default: true
  },
  notes: String
}, {
  timestamps: true
});

// Index for efficient queries
cycleSchema.index({ user: 1, startDate: -1 });
cycleSchema.index({ user: 1, cycleNumber: -1 });

export default mongoose.model('Cycle', cycleSchema);
