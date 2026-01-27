import Subscription from '../../models/Subscription.model.js';
import User from '../../models/User.model.js';

export const getSubscription = async (req, res) => {
  try {
    const userId = req.user._id;

    const subscription = await Subscription.findOne({ user: userId });
    const user = await User.findById(userId);

    const subscriptionData = subscription || {
      plan: 'free',
      isActive: false,
      isTrial: false
    };

    res.json({
      success: true,
      data: {
        subscription: subscriptionData,
        userSubscription: user.subscription
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching subscription',
      error: error.message
    });
  }
};

export const cancelSubscription = async (req, res) => {
  try {
    const userId = req.user._id;
    const { reason } = req.body;

    const subscription = await Subscription.findOne({ user: userId });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    subscription.autoRenew = false;
    subscription.cancelledAt = new Date();
    subscription.cancellationReason = reason;
    await subscription.save();

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: {
        subscription
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error cancelling subscription',
      error: error.message
    });
  }
};

export default { getSubscription, cancelSubscription };
