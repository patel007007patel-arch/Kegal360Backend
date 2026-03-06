import mongoose from 'mongoose';

const favoriteMeditationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    meditation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Meditation',
        required: true
    }
}, {
    timestamps: true
});

// Ensure a user can only favorite a specific meditation once
favoriteMeditationSchema.index({ user: 1, meditation: 1 }, { unique: true });

export default mongoose.model('FavoriteMeditation', favoriteMeditationSchema);
