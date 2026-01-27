import mongoose from 'mongoose';

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  type: {
    type: String,
    enum: ['yoga', 'meditation', 'breathwork'],
    required: true
  },
  category: {
    type: String,
    enum: ['menstrual', 'follicular', 'ovulation', 'luteal', 'general'],
    default: 'general'
  },
  phase: {
    type: String,
    enum: ['menstrual', 'follicular', 'ovulation', 'luteal', 'all'],
    default: 'all'
  },
  filePath: {
    type: String,
    required: true
  },
  thumbnail: String,
  duration: {
    type: Number, // in seconds
    required: true
  },
  durationMinutes: {
    type: Number, // in minutes
    required: true
  },
  equipment: {
    type: String,
    default: 'Equipment-free'
  },
  benefits: [String],
  isPremium: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sequence: {
    poses: [{
      name: String,
      duration: Number, // in seconds
      description: String,
      order: Number
    }]
  },
  instructor: {
    name: String,
    bio: String,
    image: String
  },
  views: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

export default mongoose.model('Video', videoSchema);
