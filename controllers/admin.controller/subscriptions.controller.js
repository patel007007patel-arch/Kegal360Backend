import Subscription from '../../models/Subscription.model.js';
import User from '../../models/User.model.js';

export const getAdminSubscriptions = async (req, res) => {
  try {
    const { page = 1, limit = 50, plan, isActive, isTrial, dateFrom, dateTo } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (plan) query.plan = plan;
    if (isActive !== undefined && isActive !== '') query.isActive = isActive === 'true';
    if (isTrial !== undefined && isTrial !== '') query.isTrial = isTrial === 'true';

    if (dateFrom || dateTo) {
      query.startDate = {};
      if (dateFrom) query.startDate.$gte = new Date(dateFrom);
      if (dateTo) query.startDate.$lte = new Date(dateTo);
    }

    const subscriptions = await Subscription.find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Subscription.countDocuments(query);

    res.json({
      success: true,
      data: {
        subscriptions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching subscriptions',
      error: error.message
    });
  }
};

export const deleteAdminSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    await Subscription.findByIdAndDelete(req.params.id);

    // Keep User.subscription in sync (reset to free)
    await User.findByIdAndUpdate(subscription.user, {
      'subscription.plan': 'free',
      'subscription.startDate': null,
      'subscription.endDate': null,
      'subscription.isActive': false,
      'subscription.paymentId': null
    });

    res.json({ success: true, message: 'Subscription deleted successfully' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting subscription',
      error: error.message
    });
  }
};

