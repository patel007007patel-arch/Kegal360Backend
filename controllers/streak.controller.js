import Streak from '../models/Streak.model.js';

// Add or update today's streak
export const addStreak = async (req, res) => {
    try {
        const userId = req.user._id;
        const { streak_status, phase } = req.body;

        if (streak_status === undefined || !phase) {
            return res.status(400).json({
                success: false,
                message: 'streak_status and phase are required in the body'
            });
        }

        if (![0, 1].includes(Number(streak_status))) {
            return res.status(400).json({
                success: false,
                message: 'streak_status must be 0 or 1'
            });
        }

        // Get today's date in UTC (start of day)
        const now = new Date();
        const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

        // Check if a streak for today already exists
        let streak = await Streak.findOne({ user: userId, date: today });

        if (streak) {
            // Update existing streak for today
            streak.streak_status = Number(streak_status);
            streak.phase = phase;
            await streak.save();
        } else {
            // Create a new streak for today
            streak = new Streak({
                user: userId,
                date: today,
                streak_status: Number(streak_status),
                phase
            });
            await streak.save();
        }

        res.status(200).json({
            success: true,
            message: 'Streak saved successfully',
            data: streak
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to save streak',
            error: error.message
        });
    }
};

// Get all streaks for the user
export const getStreaks = async (req, res) => {
    try {
        const userId = req.user._id;
        const { month, year } = req.query;

        const query = { user: userId };

        // Add exact match filters if provided as query params
        if (month || year) {
            const currentYear = new Date().getUTCFullYear();
            const filterYear = year ? parseInt(year, 10) : currentYear;

            if (month) {
                const parsedMonth = parseInt(month, 10);
                // month from query is 1-12
                // Date.UTC uses 0-11
                const startDate = new Date(Date.UTC(filterYear, parsedMonth - 1, 1));
                const endDate = new Date(Date.UTC(filterYear, parsedMonth, 1));
                query.date = { $gte: startDate, $lt: endDate };
            } else {
                // Only year is provided
                const startDate = new Date(Date.UTC(filterYear, 0, 1));
                const endDate = new Date(Date.UTC(filterYear + 1, 0, 1));
                query.date = { $gte: startDate, $lt: endDate };
            }
        }

        const streaks = await Streak.find(query).sort({ date: -1 });

        res.status(200).json({
            success: true,
            data: streaks
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch streaks',
            error: error.message
        });
    }
};
