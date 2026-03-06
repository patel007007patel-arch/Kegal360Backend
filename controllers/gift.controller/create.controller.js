import GiftSubscription from '../../models/GiftSubscription.model.js';
import User from '../../models/User.model.js';
import Subscription from '../../models/Subscription.model.js';

export const createGiftSubscription = async (req, res) => {
  try {
    const { partnerCode, plan, message, paymentId, paymentMethod, amount } = req.body;

    if (!partnerCode || !plan) {
      return res.status(400).json({
        success: false,
        message: 'Partner code and plan are required'
      });
    }

    if (!['monthly', 'yearly'].includes(plan)) {
      return res.status(400).json({
        success: false,
        message: 'Plan must be monthly or yearly'
      });
    }

    // Find recipient by partner code
    const recipient = await User.findOne({ partnerCode: partnerCode.toUpperCase() });

    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Invalid partner code'
      });
    }

    // Get sender ID (can be null for anonymous gifts - no auth required)
    const senderId = req.user?._id || null;

    // Check if user is gifting to themselves (only if authenticated)
    if (senderId && senderId.toString() === recipient._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot gift subscription to yourself'
      });
    }

    // Calculate subscription dates
    const startDate = new Date();
    const endDate = new Date();
    if (plan === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    const prices = {
      monthly: 4.99,
      yearly: 39.99
    };

    // Check if payment is provided - if yes, activate immediately (DEPRECATED: defer to webhook)
    const shouldActivate = false; // We don't activate or set dates here anymore. The webhook does.

    // Create or update subscription directly (no redemption needed)
    let subscription = await Subscription.findOne({ user: recipient._id });

    if (subscription) {
      subscription.plan = plan;
      subscription.planState = 'inactive';
      subscription.paymentStatus = 'pending';
      subscription.paymentId = paymentId;
      subscription.paymentMethod = paymentMethod || 'REVENUECAT';
      subscription.revenuecatId = recipient._id; // Recipient gets the subscription
      subscription.autoRenew = false;
    } else {
      subscription = new Subscription({
        user: recipient._id,
        plan,
        planState: 'inactive',   // Default inactive until webhook
        paymentStatus: 'pending',
        paymentId,
        paymentMethod: paymentMethod || 'REVENUECAT',
        revenuecatId: recipient._id,
        autoRenew: false
      });
    }

    await subscription.save();

    // We do NOT update User.subscription properties here. That is exclusively the webhook's job now.

    // Calculate gift expiration (for record keeping)
    const duration = plan === 'yearly' ? 12 : 1;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + duration);

    // Create gift subscription record (marked as redeemed/active immediately if payment provided)
    const giftSubscription = new GiftSubscription({
      recipient: recipient._id,
      sender: senderId || null,
      partnerCode: partnerCode.toUpperCase(),
      plan,
      duration,
      status: shouldActivate ? 'redeemed' : 'pending', // Redeemed if payment provided
      paymentId,
      paymentMethod,
      amount,
      message,
      expiresAt,
      activatedAt: shouldActivate ? startDate : null,
      redeemedAt: shouldActivate ? startDate : null,
      redeemedBy: shouldActivate ? recipient._id : null
    });

    await giftSubscription.save();

    res.status(201).json({
      success: true,
      message: shouldActivate
        ? 'Gift subscription activated successfully'
        : 'Gift subscription created successfully. Payment required to activate.',
      data: {
        giftSubscription: {
          id: giftSubscription._id,
          recipient: {
            id: recipient._id,
            name: recipient.name
          },
          plan,
          duration,
          status: giftSubscription.status,
          activated: shouldActivate,
          subscription: shouldActivate ? {
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            isActive: subscription.isActive
          } : null
        }
      }
    });
  } catch (error) {
    console.error('Create gift subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating gift subscription',
      error: error.message
    });
  }
};

export default createGiftSubscription;
