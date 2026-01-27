import GiftSubscription from '../../models/GiftSubscription.model.js';
import User from '../../models/User.model.js';

export const getMyGifts = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get gifts received by this user
    const receivedGifts = await GiftSubscription.find({
      recipient: userId
    })
      .populate('sender', 'name email')
      .sort({ createdAt: -1 });

    // Get gifts sent by this user
    const sentGifts = await GiftSubscription.find({
      sender: userId
    })
      .populate('recipient', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        received: receivedGifts,
        sent: sentGifts,
        pendingCount: receivedGifts.filter(g => g.status === 'pending').length
      }
    });
  } catch (error) {
    console.error('Get my gifts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching gifts',
      error: error.message
    });
  }
};

export const getGiftById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const gift = await GiftSubscription.findById(id)
      .populate('recipient', 'name email')
      .populate('sender', 'name email');

    if (!gift) {
      return res.status(404).json({
        success: false,
        message: 'Gift subscription not found'
      });
    }

    // Verify user has access (either sender or recipient)
    const isRecipient = gift.recipient._id.toString() === userId.toString();
    const isSender = gift.sender && gift.sender._id.toString() === userId.toString();

    if (!isRecipient && !isSender) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this gift'
      });
    }

    res.json({
      success: true,
      data: {
        gift
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching gift',
      error: error.message
    });
  }
};

export const getGiftsByCode = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Partner code is required'
      });
    }

    // Find user by code
    const user = await User.findOne({ partnerCode: code.toUpperCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Invalid partner code'
      });
    }

    // Get pending gifts for this user
    const pendingGifts = await GiftSubscription.find({
      recipient: user._id,
      status: 'pending'
    })
      .populate('sender', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        recipient: {
          id: user._id,
          name: user.name
        },
        pendingGifts: pendingGifts.map(gift => ({
          id: gift._id,
          plan: gift.plan,
          message: gift.message,
          giftedAt: gift.giftedAt,
          sender: gift.sender ? {
            name: gift.sender.name
          } : { name: 'Anonymous' }
        }))
      }
    });
  } catch (error) {
    console.error('Get gifts by code error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching gifts',
      error: error.message
    });
  }
};

export default { getMyGifts, getGiftById, getGiftsByCode };
