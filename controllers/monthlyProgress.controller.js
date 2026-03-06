import MonthlyProgress from '../models/MonthlyProgress.model.js';

// Get monthly progress for the logged-in user
export const getMonthlyProgress = async (req, res) => {
    try {
        const { month, year } = req.query;

        // Base query for the authenticated user
        const query = { user: req.user._id };

        // Add exact match filters if provided as query params
        if (month) query.month = parseInt(month, 10);
        if (year) query.year = parseInt(year, 10);

        // Fetch records, sorted with the newest ones first
        const monthlyData = await MonthlyProgress.find(query)
            .sort({ year: -1, month: -1 });

        res.json({
            success: true,
            message: 'Monthly progress retrieved successfully',
            data: {
                monthlyProgress: monthlyData
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching monthly progress',
            error: error.message
        });
    }
};
