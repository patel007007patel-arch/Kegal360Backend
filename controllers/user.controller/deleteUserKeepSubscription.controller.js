import User from '../../models/User.model.js';
import Log from '../../models/Log.model.js';
import Cycle from '../../models/Cycle.model.js';
import Notification from '../../models/Notification.model.js';
import VideoProgress from '../../models/VideoProgress.model.js';
import UserProgress from '../../models/UserProgress.model.js';
import Favorite from '../../models/Favorite.model.js';
import CustomLog from '../../models/CustomLog.model.js';
import CycleSwitchHistory from '../../models/CycleSwitchHistory.model.js';
import OtpToken from '../../models/OtpToken.model.js';

/**
 * DELETE /api/users/data-preserve-subscription
 * Permanently deletes the authenticated user and all associated data,
 * EXCEPT for subscription and gift subscription records.
 */
export const deleteUserKeepSubscription = async (req, res) => {
    try {
        const userId = req.user._id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const userEmail = user.email;

        // Delete all user-associated data (except Subscriptions)
        await Promise.all([
            Log.deleteMany({ user: userId }),
            Cycle.deleteMany({ user: userId }),
            Notification.deleteMany({ user: userId }),
            VideoProgress.deleteMany({ user: userId }),
            UserProgress.deleteMany({ user: userId }),
            Favorite.deleteMany({ user: userId }),
            CustomLog.deleteMany({ user: userId }),
            CycleSwitchHistory.deleteMany({ user: userId }),
            OtpToken.deleteMany({ email: userEmail.toLowerCase() })
        ]);

        // Remove this user from partners' sharedWith and clear sharedBy where they pointed to this user
        await User.updateMany(
            { sharedWith: userId },
            { $pull: { sharedWith: userId } }
        );
        await User.updateMany(
            { sharedBy: userId },
            { $unset: { sharedBy: '' } }
        );

        // Reset user data without deleting the account
        await User.findByIdAndUpdate(userId, {
            name: '',
            birthYear: null,
            appFor: 'myself',
            onboardingCompleted: false,
            trackCycle: true,
            cycleType: 'regular',
            cycleLength: 28,
            periodLength: 5,
            cycleLengthRange: null,
            lastPeriodStart: null,
            lastPeriodEnd: null,
            partnerCode: null,
            sharedWith: [],
            sharedBy: null,
            profilePicture: '',
            language: 'eng',
            settings: {
                pushNotifications: true,
                darkTheme: false,
                emailUpdates: false
            }
        });

        res.json({
            success: true,
            message: 'User data (excluding subscriptions) has been permanently deleted/reset'
        });
    } catch (error) {
        console.error('Delete user (keep subscription) error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting user',
            error: error.message
        });
    }
};

export default deleteUserKeepSubscription;
