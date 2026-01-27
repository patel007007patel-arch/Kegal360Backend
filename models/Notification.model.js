import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['period_reminder', 'ovulation_reminder', 'log_reminder', 'yoga_reminder', 'meditation_reminder', 'subscription', 'general'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  scheduledFor: Date,
  sentAt: Date,
  actionUrl: String,
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Index
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ scheduledFor: 1, sentAt: 1 });

export default mongoose.model('Notification', notificationSchema);
