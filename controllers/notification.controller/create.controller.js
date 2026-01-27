import Notification from '../../models/Notification.model.js';
import User from '../../models/User.model.js';

export const createNotification = async (req, res) => {
  try {
    const { userId, userIds, sendToAll, type, title, message, scheduledFor, actionUrl, metadata } = req.body;
    const isAdmin = req.user.role === 'admin';

    // Validate notification type
    const validTypes = ['period_reminder', 'ovulation_reminder', 'log_reminder', 'yoga_reminder', 'meditation_reminder', 'subscription', 'general'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid notification type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    let targetUserIds = [];

    // Determine target users based on request
    if (sendToAll === true && isAdmin) {
      // Send to all users (admin only)
      const allUsers = await User.find({ role: 'user', isActive: true }).select('_id');
      targetUserIds = allUsers.map(user => user._id);
    } else if (userIds && Array.isArray(userIds) && userIds.length > 0 && isAdmin) {
      // Send to multiple selected users (admin only)
      // Validate all users exist
      const users = await User.find({ _id: { $in: userIds } }).select('_id');
      if (users.length !== userIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more users not found'
        });
      }
      targetUserIds = userIds;
    } else if (userId) {
      // Send to single user
      if (isAdmin) {
        // Admin can send to any user
        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }
      } else {
        // Regular users can only send to themselves
        if (userId !== req.user._id.toString()) {
          return res.status(403).json({
            success: false,
            message: 'You can only send notifications to yourself'
          });
        }
      }
      targetUserIds = [userId];
    } else {
      // Default: send to current user
      targetUserIds = [req.user._id];
    }

    if (targetUserIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No target users specified'
      });
    }

    // Create notifications for all target users
    const notifications = [];
    const scheduledDate = scheduledFor ? new Date(scheduledFor) : new Date();

    for (const targetUserId of targetUserIds) {
      const notification = new Notification({
        user: targetUserId,
        type,
        title,
        message,
        scheduledFor: scheduledDate,
        actionUrl,
        metadata
      });
      await notification.save();
      notifications.push(notification);
    }

    // Populate user data for admin
    if (isAdmin && notifications.length > 0) {
      await Notification.populate(notifications, { path: 'user', select: 'name email' });
    }

    res.status(201).json({
      success: true,
      message: `Notification${notifications.length > 1 ? 's' : ''} created successfully for ${notifications.length} user${notifications.length > 1 ? 's' : ''}`,
      data: {
        notifications,
        count: notifications.length
      }
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating notification',
      error: error.message
    });
  }
};

export default createNotification;
