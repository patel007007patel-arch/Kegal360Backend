import Subscription from '../../models/Subscription.model.js';
import User from '../../models/User.model.js';

export const getSubscription = async (req, res) => {
  try {
    const userId = req.user._id;

    const subscription = await Subscription.findOne({ user: userId });
    // const user = await User.findById(userId);


    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    res.json({
      success: true,
      data: {
        subscription: subscription,
        // userSubscription: user.subscription
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
    subscription.cancellationReason = reason || 'CANCELLED_BY_BACKEND_API';
    const revanucatSecretKey = process.env.REVENUECAT_SECRET_KEY || 'sk_njpFKuWIyLmxYtPpqXXGqZyDeZOdD';
    // 1. Attempt to Cancel in RevenueCat directly
    if (revanucatSecretKey) {
      if (!subscription.revenuecatId || !subscription.paymentId) {
        return res.status(400).json({
          success: false,
          message: 'Missing RevenueCat ID or Transaction ID on this subscription. Cannot cancel via API.'
        });
      }

      try {
        const rcResponse = await fetch(`https://api.revenuecat.com/v1/subscribers/${subscription.revenuecatId}/subscriptions/${subscription.paymentId}/cancel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.REVENUECAT_SECRET_KEY}`
          }
        });

        const rcData = await rcResponse.json();

        if (!rcResponse.ok) {
          console.error("RevenueCat Cancel API Error:", rcData);
          return res.status(400).json({
            success: false,
            message: 'RevenueCat rejected the cancellation (Apple/Google usually do not allow backend API cancellation, only Web/Stripe).',
            error: rcData
          });
        }
      } catch (err) {
        console.error("Failed to reach RevenueCat REST API:", err);
      }
    } else {
      console.warn("REVENUECAT_SECRET_KEY is missing from .env. The local database was updated, but RevenueCat was NOT hit directly.");
    }

    // 2. Save local database changes
    await subscription.save();

    // 3. Sync with User object
    const user = await User.findById(userId);
    if (user && user.subscription) {
      user.subscription.autoRenew = false;
      await user.save();
    }

    res.json({
      success: true,
      message: 'Subscription cancelled successfully. You will retain access until the end of your billing cycle.',
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
