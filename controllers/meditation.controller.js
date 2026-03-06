import Meditation from '../models/Meditation.model.js';

// Get all active meditations
export const getAllActiveMeditations = async (req, res) => {
    try {
        const filters = { isActive: true };

        if (req.query.search) {
            filters.$or = [
                { title: { $regex: req.query.search, $options: 'i' } },
                { subtitle: { $regex: req.query.search, $options: 'i' } }
            ];
        }

        const meditations = await Meditation.find(filters)
            .populate('media')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: meditations
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch meditations',
            error: error.message
        });
    }
};
