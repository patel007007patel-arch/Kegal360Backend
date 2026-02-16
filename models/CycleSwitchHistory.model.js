import mongoose from 'mongoose';

const cycleSwitchHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  switchDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  cycleType: {
    type: String,
    enum: ['regular', 'irregular', 'absent'],
    default: 'regular'
  },
  trackCycle: { type: Boolean, default: true },
  cycleLength: { type: Number, default: 28 },
  cycleLengthRange: { min: Number, max: Number },
  periodLength: { type: Number, default: 5 },
  lastPeriodStart: Date,
  lastPeriodEnd: Date
}, {
  timestamps: true
});

cycleSwitchHistorySchema.index({ user: 1, switchDate: -1 });

export default mongoose.model('CycleSwitchHistory', cycleSwitchHistorySchema);
