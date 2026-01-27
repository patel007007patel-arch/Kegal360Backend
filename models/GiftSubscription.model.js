import mongoose from 'mongoose';

const giftSubscriptionSchema = new mongoose.Schema({
  // User who receives the gift (code owner)
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // User who sends the gift (partner using code)
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Can be anonymous (using code without account)
  },
  // Partner code used to send gift
  partnerCode: {
    type: String,
    required: true
  },
  // Subscription plan gifted
  plan: {
    type: String,
    enum: ['monthly', 'yearly'],
    required: true
  },
  // Duration in months
  duration: {
    type: Number,
    default: 1 // 1 month for monthly, 12 for yearly
  },
  // Gift status
  status: {
    type: String,
    enum: ['pending', 'active', 'redeemed', 'expired', 'cancelled'],
    default: 'pending'
  },
  // Payment info (if paid by sender)
  paymentId: String,
  paymentMethod: String,
  amount: Number,
  // Gift message
  message: String,
  // Dates
  giftedAt: {
    type: Date,
    default: Date.now
  },
  activatedAt: Date,
  expiresAt: Date,
  // Redemption
  redeemedAt: Date,
  redeemedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index
giftSubscriptionSchema.index({ recipient: 1, status: 1 });
giftSubscriptionSchema.index({ partnerCode: 1 });
giftSubscriptionSchema.index({ sender: 1 });

export default mongoose.model('GiftSubscription', giftSubscriptionSchema);
