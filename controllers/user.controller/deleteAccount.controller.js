import User from '../../models/User.model.js';
import Log from '../../models/Log.model.js';
import Cycle from '../../models/Cycle.model.js';
import Notification from '../../models/Notification.model.js';
import Subscription from '../../models/Subscription.model.js';
import VideoProgress from '../../models/VideoProgress.model.js';
import UserProgress from '../../models/UserProgress.model.js';
import Favorite from '../../models/Favorite.model.js';
import CustomLog from '../../models/CustomLog.model.js';
import CycleSwitchHistory from '../../models/CycleSwitchHistory.model.js';
import GiftSubscription from '../../models/GiftSubscription.model.js';
import OtpToken from '../../models/OtpToken.model.js';

/**
 * DELETE /api/users/account
 * Permanently deletes the authenticated user and all associated data.
 */
export const deleteAccount = async (req, res) => {
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

    // Delete all user-associated data (order: child data first, then user)
    await Promise.all([
      Log.deleteMany({ user: userId }),
      Cycle.deleteMany({ user: userId }),
      Notification.deleteMany({ user: userId }),
      Subscription.deleteMany({ user: userId }),
      VideoProgress.deleteMany({ user: userId }),
      UserProgress.deleteMany({ user: userId }),
      Favorite.deleteMany({ user: userId }),
      CustomLog.deleteMany({ user: userId }),
      CycleSwitchHistory.deleteMany({ user: userId }),
      GiftSubscription.deleteMany({
        $or: [{ recipient: userId }, { sender: userId }]
      }),
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

    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: 'Account and all associated data have been permanently deleted'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting account',
      error: error.message
    });
  }
};

export default deleteAccount;
