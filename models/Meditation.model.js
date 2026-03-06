import mongoose from 'mongoose';

const meditationSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },
        subtitle: {
            type: String,
            trim: true
        },
        description: {
            type: String,
            trim: true
        },
        duration: {
            type: Number, // duration in seconds/minutes
            default: 0
        },
        benefits: [
            {
                type: String,
                trim: true
            }
        ],
        media: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Media'
        },
        thumbnail: {
            type: String // Optional image thumbnail
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

// Indexes
meditationSchema.index({ isActive: 1 });

export default mongoose.model('Meditation', meditationSchema);
