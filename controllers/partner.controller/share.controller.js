import User from '../../models/User.model.js';

export const generateShareCode = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Always generate a new unique code
    await user.generatePartnerCode();
    await user.save();

    res.json({
      success: true,
      message: 'New partner code generated successfully',
      data: {
        code: user.partnerCode,
        shareLink: `${process.env.FRONTEND_URL}/connect?code=${user.partnerCode}`
      }
    });
  } catch (error) {
    console.error('Generate share code error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating share code',
      error: error.message
    });
  }
};

export const getMyPartnerCode = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.partnerCode) {
      // Generate if doesn't exist
      await user.generatePartnerCode();
      await user.save();
    }

    res.json({
      success: true,
      data: {
        code: user.partnerCode,
        shareLink: `${process.env.FRONTEND_URL}/connect?code=${user.partnerCode}`
      }
    });
  } catch (error) {
    console.error('Get partner code error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching partner code',
      error: error.message
    });
  }
};

export const connectPartner = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user._id;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Partner code is required'
      });
    }

    // Find partner by code (codes are stored uppercase)
    const partner = await User.findOne({ partnerCode: (code || '').toString().trim().toUpperCase() });

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Invalid partner code'
      });
    }

    if (partner._id.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot connect to yourself'
      });
    }

    // Update current user to share with partner
    const user = await User.findById(userId);
    
    if (!user.sharedWith.includes(partner._id)) {
      user.sharedWith.push(partner._id);
      await user.save();
    }

    // Update partner to be shared by current user
    if (!partner.sharedBy) {
      partner.sharedBy = userId;
      await partner.save();
    }

    res.json({
      success: true,
      message: 'Partner connected successfully',
      data: {
        partner: {
          id: partner._id,
          name: partner.name,
          email: partner.email
        }
      }
    });
  } catch (error) {
    console.error('Connect partner error:', error);
    res.status(500).json({
      success: false,
      message: 'Error connecting partner',
      error: error.message
    });
  }
};

export const getSharedData = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).populate('sharedBy');

    if (!user.sharedBy) {
      return res.status(404).json({
        success: false,
        message: 'No partner connected'
      });
    }

    // Get partner's cycle data
    const Log = (await import('../../models/Log.model.js')).default;
    const Cycle = (await import('../../models/Cycle.model.js')).default;
    const { calculateCyclePredictions } = await import('../../services/cycleCalculation.service.js');

    const partnerLogs = await Log.find({ user: user.sharedBy._id })
      .sort({ date: -1 })
      .limit(30);

    const partnerCycles = await Cycle.find({ user: user.sharedBy._id })
      .sort({ startDate: -1 })
      .limit(12);

    // Calculate partner's current cycle info
    const partnerPredictions = calculateCyclePredictions(user.sharedBy);

    res.json({
      success: true,
      data: {
        partner: {
          id: user.sharedBy._id,
          name: user.sharedBy.name,
          email: user.sharedBy.email
        },
        logs: partnerLogs,
        cycles: partnerCycles,
        currentCycle: partnerPredictions
      }
    });
  } catch (error) {
    console.error('Get shared data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching shared data',
      error: error.message
    });
  }
};

// View partner data using partner code (for partners to login/view)
export const viewPartnerByCode = async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Partner code is required'
      });
    }

    // Find partner by code
    const partner = await User.findOne({ partnerCode: code.toUpperCase() });

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Invalid partner code'
      });
    }

    // Get partner's cycle data
    const Log = (await import('../../models/Log.model.js')).default;
    const Cycle = (await import('../../models/Cycle.model.js')).default;
    const { calculateCyclePredictions } = await import('../../services/cycleCalculation.service.js');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const partnerLogs = await Log.find({
      user: partner._id,
      date: { $gte: thirtyDaysAgo }
    })
      .sort({ date: -1 })
      .limit(30);

    const partnerCycles = await Cycle.find({ user: partner._id })
      .sort({ startDate: -1 })
      .limit(12);

    const partnerPredictions = calculateCyclePredictions(partner);

    res.json({
      success: true,
      data: {
        partner: {
          id: partner._id,
          name: partner.name,
          partnerCode: partner.partnerCode
        },
        cycleInfo: {
          currentPhase: partnerPredictions.currentPhase,
          cycleDay: partnerPredictions.cycleDay,
          nextPeriod: partnerPredictions.nextPeriod,
          nextOvulation: partnerPredictions.nextOvulation
        },
        logs: partnerLogs,
        cycles: partnerCycles
      }
    });
  } catch (error) {
    console.error('View partner by code error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching partner data',
      error: error.message
    });
  }
};

/**
 * Gift subscription: logged-in user pays and subscription is applied to the user who owns the code.
 * Used when partner views by code and clicks "Gift subscription".
 */
export const purchaseSubscriptionForPartner = async (req, res) => {
  try {
    const { code, plan, paymentId, paymentMethod } = req.body;
    const payerId = req.user._id;

    if (!code || !plan) {
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

    const recipient = await User.findOne({ partnerCode: (code || '').toString().toUpperCase() });
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Invalid partner code'
      });
    }

    if (recipient._id.toString() === payerId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot purchase a subscription for yourself'
      });
    }

    const Subscription = (await import('../../models/Subscription.model.js')).default;
    const prices = { monthly: 4.99, yearly: 39.99 };

    const startDate = new Date();
    const endDate = new Date();
    if (plan === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    let subscription = await Subscription.findOne({ user: recipient._id });
    if (subscription) {
      subscription.plan = plan;
      subscription.price = prices[plan];
      subscription.startDate = startDate;
      subscription.endDate = endDate;
      subscription.isActive = true;
      subscription.isTrial = false;
      subscription.trialEndDate = undefined;
      subscription.paymentId = paymentId || subscription.paymentId;
      subscription.paymentMethod = paymentMethod || subscription.paymentMethod;
      subscription.autoRenew = false;
      subscription.cancelledAt = null;
    } else {
      subscription = new Subscription({
        user: recipient._id,
        plan,
        price: prices[plan],
        startDate,
        endDate,
        isActive: true,
        isTrial: false,
        paymentId,
        paymentMethod,
        autoRenew: false
      });
    }
    await subscription.save();

    await User.findByIdAndUpdate(recipient._id, {
      'subscription.plan': plan,
      'subscription.startDate': startDate,
      'subscription.endDate': endDate,
      'subscription.isActive': true,
      'subscription.paymentId': paymentId || undefined
    });

    res.status(201).json({
      success: true,
      message: 'Subscription gifted successfully',
      data: {
        subscription: {
          plan: subscription.plan,
          endDate: subscription.endDate,
          recipient: { id: recipient._id, name: recipient.name }
        }
      }
    });
  } catch (error) {
    console.error('Purchase subscription for partner error:', error);
    res.status(500).json({
      success: false,
      message: 'Error purchasing subscription for partner',
      error: error.message
    });
  }
};

export default { generateShareCode, getMyPartnerCode, connectPartner, getSharedData, viewPartnerByCode, purchaseSubscriptionForPartner };
