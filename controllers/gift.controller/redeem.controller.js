import GiftSubscription from '../../models/GiftSubscription.model.js';
import User from '../../models/User.model.js';
import Subscription from '../../models/Subscription.model.js';

export const redeemGiftSubscription = async (req, res) => {
  try {
    const { giftId } = req.body;
    const userId = req.user._id;

    if (!giftId) {
      return res.status(400).json({
        success: false,
        message: 'Gift ID is required'
      });
    }

    // Find gift subscription
    const gift = await GiftSubscription.findById(giftId).populate('recipient');

    if (!gift) {
      return res.status(404).json({
        success: false,
        message: 'Gift subscription not found'
      });
    }

    // Verify user is the recipient
    if (gift.recipient._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to redeem this gift'
      });
    }

    // Check if already redeemed
    if (gift.status === 'redeemed') {
      return res.status(400).json({
        success: false,
        message: 'This gift has already been redeemed'
      });
    }

    // Check if expired
    if (gift.status === 'expired' || (gift.expiresAt && new Date() > gift.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'This gift has expired'
      });
    }

    // Calculate subscription dates
    const startDate = new Date();
    const endDate = new Date();
    if (gift.plan === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    const prices = {
      monthly: 4.99,
      yearly: 39.99
    };

    // Create or update subscription
    let subscription = await Subscription.findOne({ user: userId });

    if (subscription && subscription.isActive && subscription.endDate > startDate) {
      // Extend existing active subscription
      const currentEndDate = new Date(subscription.endDate);
      if (gift.plan === 'yearly') {
        currentEndDate.setFullYear(currentEndDate.getFullYear() + 1);
      } else {
        currentEndDate.setMonth(currentEndDate.getMonth() + 1);
      }
      subscription.endDate = currentEndDate;
      // Upgrade to yearly if gifting yearly
      if (gift.plan === 'yearly' && subscription.plan !== 'yearly') {
        subscription.plan = 'yearly';
        subscription.price = prices.yearly;
      }
    } else {
      // Create new subscription or replace expired one
      if (subscription) {
        subscription.plan = gift.plan;
        subscription.price = prices[gift.plan];
        subscription.startDate = startDate;
        subscription.endDate = endDate;
        subscription.isActive = true;
        subscription.isTrial = false;
        subscription.paymentId = gift.paymentId || `gift-${gift._id}`;
        subscription.paymentMethod = gift.paymentMethod || 'gift';
      } else {
        subscription = new Subscription({
          user: userId,
          plan: gift.plan,
          price: prices[gift.plan],
          startDate,
          endDate,
          isActive: true,
          isTrial: false,
          paymentId: gift.paymentId || `gift-${gift._id}`,
          paymentMethod: gift.paymentMethod || 'gift'
        });
      }
    }

    await subscription.save();

    // Update user subscription
    await User.findByIdAndUpdate(userId, {
      'subscription.plan': gift.plan,
      'subscription.startDate': startDate,
      'subscription.endDate': endDate,
      'subscription.isActive': true,
      'subscription.paymentId': gift.paymentId || `gift-${gift._id}`
    });

    // Update gift status
    gift.status = 'redeemed';
    gift.redeemedAt = new Date();
    gift.redeemedBy = userId;
    gift.activatedAt = startDate;
    await gift.save();

    // Populate sender for response
    await gift.populate('sender', 'name email');

    res.json({
      success: true,
      message: 'Gift subscription redeemed successfully',
      data: {
        subscription: {
          plan: subscription.plan,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          isActive: subscription.isActive
        },
        gift: {
          id: gift._id,
          message: gift.message,
          sender: gift.sender ? {
            name: gift.sender.name || 'Anonymous'
          } : null
        }
      }
    });
  } catch (error) {
    console.error('Redeem gift subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error redeeming gift subscription',
      error: error.message
    });
  }
};

export default redeemGiftSubscription;
