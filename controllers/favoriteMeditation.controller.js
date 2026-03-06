import FavoriteMeditation from '../models/FavoriteMeditation.model.js';
import Meditation from '../models/Meditation.model.js';

// Get user's favorite meditations
export const getFavoriteMeditations = async (req, res) => {
    try {
        const userId = req.user._id;

        const favorites = await FavoriteMeditation.find({ user: userId })
            .populate({
                path: 'meditation',
                populate: {
                    path: 'media'
                }
            })
            .sort({ createdAt: -1 });

        // Filter out any where the meditation might have been deleted but favorite record remains
        const activeFavorites = favorites
            .filter(fav => fav.meditation !== null)
            .map(fav => fav.meditation);

        res.status(200).json({
            success: true,
            data: activeFavorites
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch favorite meditations',
            error: error.message
        });
    }
};

// Add meditation to favorites
export const addFavoriteMeditation = async (req, res) => {
    try {
        const userId = req.user._id;
        const { meditationId } = req.body;

        if (!meditationId) {
            return res.status(400).json({ success: false, message: 'meditationId is required in the body' });
        }

        // Verify meditation exists
        const meditationExists = await Meditation.findById(meditationId);
        if (!meditationExists) {
            return res.status(404).json({ success: false, message: 'Meditation not found' });
        }

        // Check if already favorited
        const existingFavorite = await FavoriteMeditation.findOne({ user: userId, meditation: meditationId });
        if (existingFavorite) {
            return res.status(400).json({ success: false, message: 'Meditation is already in favorites' });
        }

        const newFavorite = new FavoriteMeditation({
            user: userId,
            meditation: meditationId
        });

        await newFavorite.save();

        res.status(201).json({
            success: true,
            message: 'Meditation added to favorites successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to add meditation to favorites',
            error: error.message
        });
    }
};

// Remove meditation from favorites
export const removeFavoriteMeditation = async (req, res) => {
    try {
        const userId = req.user._id;
        const { meditationId } = req.body;

        if (!meditationId) {
            return res.status(400).json({ success: false, message: 'meditationId is required in the body' });
        }

        const deletedFavorite = await FavoriteMeditation.findOneAndDelete({
            user: userId,
            meditation: meditationId
        });

        if (!deletedFavorite) {
            return res.status(404).json({ success: false, message: 'Meditation not found in favorites' });
        }

        res.status(200).json({
            success: true,
            message: 'Meditation removed from favorites successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to remove meditation from favorites',
            error: error.message
        });
    }
};
