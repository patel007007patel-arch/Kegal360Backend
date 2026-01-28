import Favorite from '../models/Favorite.model.js';
import Session from '../models/Session.model.js';

// Get user favorites
export const getFavorites = async (req, res) => {
  try {
    const { sessionType } = req.query;
    let query = { user: req.user._id };

    let favorites = await Favorite.find(query)
      .populate({
        path: 'session',
        match: { isActive: true },
        populate: {
          path: 'sequence',
          populate: {
            path: 'cyclePhase'
          }
        }
      })
      .sort({ createdAt: -1 });

    // Filter out null sessions and by sessionType if specified
    favorites = favorites.filter(f => {
      if (!f.session) return false;
      if (sessionType && f.session.sessionType !== sessionType) return false;
      return true;
    });

    res.json({
      success: true,
      data: { favorites }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching favorites',
      error: error.message
    });
  }
};

// Add to favorites
export const addFavorite = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    // Check if session exists
    const session = await Session.findById(sessionId);
    if (!session || !session.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if already favorited
    const existing = await Favorite.findOne({
      user: req.user._id,
      session: sessionId
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Session already in favorites'
      });
    }

    const favorite = await Favorite.create({
      user: req.user._id,
      session: sessionId
    });

    res.status(201).json({
      success: true,
      message: 'Added to favorites',
      data: { favorite }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding to favorites',
      error: error.message
    });
  }
};

// Remove from favorites
export const removeFavorite = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const favorite = await Favorite.findOneAndDelete({
      user: req.user._id,
      session: sessionId
    });

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Favorite not found'
      });
    }

    res.json({
      success: true,
      message: 'Removed from favorites'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing from favorites',
      error: error.message
    });
  }
};
