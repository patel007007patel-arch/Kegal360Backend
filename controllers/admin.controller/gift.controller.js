import GiftSubscription from '../../models/GiftSubscription.model.js';
import User from '../../models/User.model.js';

// Get all gifts (admin)
export const getAllGifts = async (req, res) => {
  try {
    const { page = 1, limit = 50, status, plan, partnerCode } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (status) query.status = status;
    if (plan) query.plan = plan;
    if (partnerCode) query.partnerCode = partnerCode.toUpperCase();

    const gifts = await GiftSubscription.find(query)
      .populate('recipient', 'name email partnerCode')
      .populate('sender', 'name email')
      .populate('redeemedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await GiftSubscription.countDocuments(query);

    res.json({
      success: true,
      data: {
        gifts,
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
      message: 'Error fetching gifts',
      error: error.message
    });
  }
};

// Get gift by ID (admin)
export const getGiftById = async (req, res) => {
  try {
    const gift = await GiftSubscription.findById(req.params.id)
      .populate('recipient', 'name email partnerCode')
      .populate('sender', 'name email')
      .populate('redeemedBy', 'name email');

    if (!gift) {
      return res.status(404).json({
        success: false,
        message: 'Gift not found'
      });
    }

    res.json({
      success: true,
      data: { gift }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching gift',
      error: error.message
    });
  }
};

// Delete gift (admin)
export const deleteGift = async (req, res) => {
  try {
    const gift = await GiftSubscription.findById(req.params.id);

    if (!gift) {
      return res.status(404).json({
        success: false,
        message: 'Gift not found'
      });
    }

    // Only allow deletion of pending or cancelled gifts
    if (gift.status === 'redeemed' || gift.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete redeemed or active gifts'
      });
    }

    await GiftSubscription.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Gift deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting gift',
      error: error.message
    });
  }
};

