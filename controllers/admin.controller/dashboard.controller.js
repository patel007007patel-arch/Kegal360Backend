import User from '../../models/User.model.js';
import Log from '../../models/Log.model.js';
import Cycle from '../../models/Cycle.model.js';
import Subscription from '../../models/Subscription.model.js';
import Video from '../../models/Video.model.js';
import Notification from '../../models/Notification.model.js';
import GiftSubscription from '../../models/GiftSubscription.model.js';

export const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const premiumUsers = await Subscription.countDocuments({ isActive: true });
    const totalLogs = await Log.countDocuments();
    const totalCycles = await Cycle.countDocuments();
    const totalVideos = await Video.countDocuments();
    const totalNotifications = await Notification.countDocuments();
    const totalGifts = await GiftSubscription.countDocuments();

    // Recent users (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Users per day (last 7 days) for charts
    const usersPerDay = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const count = await User.countDocuments({
        createdAt: { $gte: d, $lt: next }
      });
      usersPerDay.push({ date: d.toISOString().slice(0, 10), label: d.toLocaleDateString('en-US', { weekday: 'short' }), count });
    }

    // Logs per day (last 7 days)
    const logsPerDay = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const count = await Log.countDocuments({
        date: { $gte: d, $lt: next }
      });
      logsPerDay.push({ date: d.toISOString().slice(0, 10), label: d.toLocaleDateString('en-US', { weekday: 'short' }), count });
    }

    // Cycles by phase (for donut)
    const phaseCounts = await Cycle.aggregate([
      { $group: { _id: '$phase', count: { $sum: 1 } } }
    ]);
    const cyclesByPhase = {
      menstrual: 0,
      follicular: 0,
      ovulation: 0,
      luteal: 0
    };
    phaseCounts.forEach(({ _id, count }) => {
      if (cyclesByPhase.hasOwnProperty(_id)) cyclesByPhase[_id] = count;
    });

    // Subscriptions by plan (for donut)
    const planCounts = await Subscription.aggregate([
      { $group: { _id: '$plan', count: { $sum: 1 } } }
    ]);
    const subscriptionsByPlan = { free: 0, monthly: 0, yearly: 0 };
    planCounts.forEach(({ _id, count }) => {
      if (subscriptionsByPlan.hasOwnProperty(_id)) subscriptionsByPlan[_id] = count;
    });

    // Recent app activity (last 5 users + last 5 logs)
    const recentUsersList = await User.find({ role: 'user' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email createdAt')
      .lean();
    const recentLogsList = await Log.find()
      .sort({ createdAt: -1 })
      .populate('user', 'name email')
      .limit(5)
      .lean();
    const recentActivity = [
      ...recentUsersList.map(u => ({
        type: 'user',
        label: `New user: ${u.name || u.email}`,
        time: u.createdAt,
        email: u.email
      })),
      ...recentLogsList.map(l => ({
        type: 'log',
        label: `Log by ${l.user?.name || l.user?.email || 'User'}`,
        time: l.createdAt,
        date: l.date
      }))
    ]
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 8);

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          activeUsers,
          premiumUsers,
          totalLogs,
          totalCycles,
          recentUsers,
          totalVideos,
          totalNotifications,
          totalGifts
        },
        charts: {
          usersPerDay,
          logsPerDay,
          cyclesByPhase,
          subscriptionsByPlan
        },
        recentActivity
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard stats',
      error: error.message
    });
  }
};
