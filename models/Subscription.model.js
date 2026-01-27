import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  plan: {
    type: String,
    enum: ['free', 'monthly', 'yearly'],
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isTrial: {
    type: Boolean,
    default: false
  },
  trialEndDate: Date,
  paymentId: String,
  paymentMethod: String,
  autoRenew: {
    type: Boolean,
    default: true
  },
  cancelledAt: Date,
  cancellationReason: String
}, {
  timestamps: true
});

// Index
subscriptionSchema.index({ user: 1 });
subscriptionSchema.index({ endDate: 1, isActive: 1 });

export default mongoose.model('Subscription', subscriptionSchema);
