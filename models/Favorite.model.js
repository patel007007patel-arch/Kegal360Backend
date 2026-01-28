import mongoose from 'mongoose';

const favoriteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true
  }
}, {
  timestamps: true
});

// Index to prevent duplicates and for efficient queries
favoriteSchema.index({ user: 1, session: 1 }, { unique: true });
favoriteSchema.index({ user: 1 });

export default mongoose.model('Favorite', favoriteSchema);
