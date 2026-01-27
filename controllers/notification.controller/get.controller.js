import Notification from '../../models/Notification.model.js';

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { isRead, limit = 50, page = 1, userId: filterUserId, type } = req.query;
    const isAdmin = req.user.role === 'admin';

    // Admin can see all notifications, regular users only see their own
    let query = isAdmin ? {} : { user: userId };

    // Admin can filter by userId
    if (isAdmin && filterUserId) {
      query.user = filterUserId;
    }

    // Filter by type if provided
    if (type) {
      query.type = type;
    }

    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const notifications = await Notification.find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Notification.countDocuments(query);

    const unreadCount = await Notification.countDocuments({
      ...(isAdmin ? {} : { user: userId }),
      isRead: false
    });

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        count: notifications.length,
        ...(isAdmin && {
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit))
          }
        })
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error.message
    });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';

    // Admin can mark any notification as read, regular users only their own
    const query = isAdmin ? { _id: id } : { _id: id, user: userId };

    const notification = await Notification.findOneAndUpdate(
      query,
      { isRead: true, readAt: new Date() },
      { new: true }
    ).populate('user', 'name email');

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: {
        notification
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating notification',
      error: error.message
    });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany(
      { user: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating notifications',
      error: error.message
    });
  }
};

// Update notification (admin can update any, users can only update read status)
export const updateNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const { isRead } = req.body;
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';

    // Admin can update any notification, regular users only their own
    const query = isAdmin ? { _id: id } : { _id: id, user: userId };

    const updateData = {};
    if (isRead !== undefined) {
      updateData.isRead = isRead;
      if (isRead) {
        updateData.readAt = new Date();
      } else {
        updateData.readAt = null;
      }
    }

    const notification = await Notification.findOneAndUpdate(
      query,
      updateData,
      { new: true }
    ).populate('user', 'name email');

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification updated successfully',
      data: {
        notification
      }
    });
  } catch (error) {
    console.error('Update notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notification',
      error: error.message
    });
  }
};

// Delete notification (admin only)
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can delete notifications'
      });
    }

    const notification = await Notification.findByIdAndDelete(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting notification',
      error: error.message
    });
  }
};

export default { getNotifications, markAsRead, markAllAsRead, updateNotification, deleteNotification };
