import Subscription from '../../models/Subscription.model.js';
import User from '../../models/User.model.js';

export const createSubscription = async (req, res) => {
  try {
    const { plan, paymentId, paymentMethod } = req.body;
    const userId = req.user._id;

    if (!plan || !['monthly', 'yearly'].includes(plan)) {
      return res.status(400).json({
        success: false,
        message: 'Valid plan (monthly or yearly) is required'
      });
    }

    // Calculate dates
    const startDate = new Date();
    const isTrial = true; // First subscription is trial
    const trialDays = 7;
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + trialDays);

    let endDate = new Date();
    if (plan === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    const prices = {
      monthly: 4.99,
      yearly: 39.99 // $3.33/month when yearly
    };

    // Create or update subscription
    let subscription = await Subscription.findOne({ user: userId });

    if (subscription) {
      subscription.plan = plan;
      subscription.price = prices[plan];
      subscription.startDate = startDate;
      subscription.endDate = endDate;
      subscription.isActive = true;
      subscription.isTrial = isTrial;
      subscription.trialEndDate = trialEndDate;
      subscription.paymentId = paymentId;
      subscription.paymentMethod = paymentMethod;
      subscription.autoRenew = true;
      subscription.cancelledAt = null;
    } else {
      subscription = new Subscription({
        user: userId,
        plan,
        price: prices[plan],
        startDate,
        endDate,
        isActive: true,
        isTrial,
        trialEndDate,
        paymentId,
        paymentMethod,
        autoRenew: true
      });
    }

    await subscription.save();

    // Update user subscription
    await User.findByIdAndUpdate(userId, {
      'subscription.plan': plan,
      'subscription.startDate': startDate,
      'subscription.endDate': endDate,
      'subscription.isActive': true,
      'subscription.paymentId': paymentId
    });

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      data: {
        subscription
      }
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating subscription',
      error: error.message
    });
  }
};

export default createSubscription;
