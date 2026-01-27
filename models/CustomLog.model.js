import mongoose from 'mongoose';

const customLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: 'heart'
  },
  icons: [{
    icon: String,
    label: String,
    order: Number
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index
customLogSchema.index({ user: 1, isActive: 1 });

export default mongoose.model('CustomLog', customLogSchema);
