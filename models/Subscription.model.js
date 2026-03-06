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
    required: false
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
  planState: {
    type: String,
    enum: ['active', 'inactive', 'expire'],
    default: 'inactive'
  },
  isTrial: {
    type: Boolean,
    default: false
  },
  trialEndDate: Date,
  paymentId: String, // Kept for backwards compatibility or frontend transaction ID
  paymentMethod: String,
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  revenuecatId: { // app_user_id or original_transaction_id from RevenueCat
    type: String,
    sparse: true
  },
  store: {
    type: String,
    enum: ['APP_STORE', 'PLAY_STORE', 'STRIPE', 'PROMOTIONAL', 'AMAZON', 'TEST_STORE', 'WEB', 'null'],
    default: 'null'
  },
  environment: {
    type: String,
    enum: ['PRODUCTION', 'SANDBOX', 'null'],
    default: 'null'
  },
  autoRenew: {
    type: Boolean,
    default: true
  },
  cancelledAt: Date,
  cancellationReason: String // Can now store RevenueCat reasons (e.g., 'UNSUBSCRIBE', 'BILLING_ERROR')
}, {
  timestamps: true
});

// Index
subscriptionSchema.index({ user: 1 });
subscriptionSchema.index({ endDate: 1, planState: 1 });

export default mongoose.model('Subscription', subscriptionSchema);
