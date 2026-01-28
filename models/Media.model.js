import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  mediaType: {
    type: String,
    required: true,
    enum: ['video', 'audio', 'image', 'animation']
  },
  filePath: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String
  },
  duration: {
    type: Number, // in seconds (for video/audio)
    default: 0
  },
  orientation: {
    type: String,
    enum: ['portrait', 'landscape', 'square'],
    default: 'portrait'
  },
  instructor: {
    name: String,
    bio: String,
    image: String
  },
  tags: [{
    type: String // e.g., 'yoga', 'kegel', 'breathing', 'meditation'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for efficient queries
mediaSchema.index({ mediaType: 1 });
mediaSchema.index({ tags: 1 });
mediaSchema.index({ isActive: 1 });

export default mongoose.model('Media', mediaSchema);
