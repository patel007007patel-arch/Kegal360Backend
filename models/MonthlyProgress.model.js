import mongoose from 'mongoose';

const monthlyProgressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    month: {
        type: Number,
        required: true,
        min: 1,
        max: 12
    },
    year: {
        type: Number,
        required: true
    },
    totalStepsCompleted: {
        type: Number,
        default: 0
    },
    totalTimeSpent: {
        type: Number, // in seconds
        default: 0
    }
}, {
    timestamps: true
});

// Ensure only one record per user per month/year
monthlyProgressSchema.index({ user: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.model('MonthlyProgress', monthlyProgressSchema);
