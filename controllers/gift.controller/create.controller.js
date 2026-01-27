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

    // Check if payment is provided - if yes, activate immediately
    const shouldActivate = paymentId && paymentMethod; // Activate if payment info is provided

    // Create or update subscription directly (no redemption needed)
    let subscription = await Subscription.findOne({ user: recipient._id });

    if (subscription && subscription.isActive && subscription.endDate > startDate) {
      // Extend existing active subscription
      const currentEndDate = new Date(subscription.endDate);
      if (plan === 'yearly') {
        currentEndDate.setFullYear(currentEndDate.getFullYear() + 1);
      } else {
        currentEndDate.setMonth(currentEndDate.getMonth() + 1);
      }
      subscription.endDate = currentEndDate;
      // Upgrade to yearly if gifting yearly
      if (plan === 'yearly' && subscription.plan !== 'yearly') {
        subscription.plan = 'yearly';
        subscription.price = prices.yearly;
      }
    } else {
      // Create new subscription or replace expired one
      if (subscription) {
        subscription.plan = plan;
        subscription.price = prices[plan];
        subscription.startDate = startDate;
        subscription.endDate = endDate;
        subscription.isActive = true;
        subscription.isTrial = false;
        subscription.paymentId = paymentId || `gift-${Date.now()}`;
        subscription.paymentMethod = paymentMethod || 'gift';
      } else {
        subscription = new Subscription({
          user: recipient._id,
          plan,
          price: prices[plan],
          startDate,
          endDate,
          isActive: true,
          isTrial: false,
          paymentId: paymentId || `gift-${Date.now()}`,
          paymentMethod: paymentMethod || 'gift'
        });
      }
    }

    await subscription.save();

    // Update user subscription field
    await User.findByIdAndUpdate(recipient._id, {
      'subscription.plan': plan,
      'subscription.startDate': startDate,
      'subscription.endDate': endDate,
      'subscription.isActive': true,
      'subscription.paymentId': paymentId || `gift-${Date.now()}`
    });

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
