import mongoose from 'mongoose';

const streakSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        default: function () {
            // Default to start of current day in UTC
            const now = new Date();
            return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        },
        required: true
    },
    streak_status: {
        type: Number,
        enum: [0, 1],
        default: 0,
        required: true
    },
    phase: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// Ensure only one streak entry per user per day
streakSchema.index({ user: 1, date: 1 }, { unique: true });

export default mongoose.model('Streak', streakSchema);
