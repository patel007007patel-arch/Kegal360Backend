import Video from '../../models/Video.model.js';
import VideoProgress from '../../models/VideoProgress.model.js';
import User from '../../models/User.model.js';

export const getVideos = async (req, res) => {
  try {
    const { type, phase, category, isPremium } = req.query;
    const userId = req.user._id;

    let query = { isActive: true };

    if (type) query.type = type;
    if (phase && phase !== 'all') query.phase = phase;
    if (category) query.category = category;
    if (isPremium !== undefined) query.isPremium = isPremium === 'true';

    // Check user subscription for premium content
    const user = await User.findById(userId);
    const hasPremiumAccess = user.subscription?.isActive && 
                            (user.subscription.plan === 'monthly' || user.subscription.plan === 'yearly');

    if (!hasPremiumAccess) {
      query.isPremium = false; // Only show free content
    }

    const videos = await Video.find(query).sort({ createdAt: -1 });

    // Get progress for each video
    const videoIds = videos.map(v => v._id);
    const progress = await VideoProgress.find({
      user: userId,
      video: { $in: videoIds }
    });

    const progressMap = {};
    progress.forEach(p => {
      progressMap[p.video.toString()] = p;
    });

    const videosWithProgress = videos.map(video => {
      const videoObj = video.toObject();
      const videoProgress = progressMap[video._id.toString()];
      
      return {
        ...videoObj,
        progress: videoProgress ? {
          currentPosition: videoProgress.currentPosition,
          completed: videoProgress.completed,
          watchedDuration: videoProgress.watchedDuration,
          lastWatched: videoProgress.lastWatched
        } : null
      };
    });

    res.json({
      success: true,
      data: {
        videos: videosWithProgress,
        count: videosWithProgress.length
      }
    });
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching videos',
      error: error.message
    });
  }
};

export const getVideoById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Check premium access
    const user = await User.findById(userId);
    const hasPremiumAccess = user.subscription?.isActive && 
                            (user.subscription.plan === 'monthly' || user.subscription.plan === 'yearly');

    if (video.isPremium && !hasPremiumAccess) {
      return res.status(403).json({
        success: false,
        message: 'Premium subscription required'
      });
    }

    // Get progress
    const progress = await VideoProgress.findOne({
      user: userId,
      video: id
    });

    // Update view count
    video.views += 1;
    await video.save();

    res.json({
      success: true,
      data: {
        video: {
          ...video.toObject(),
          progress: progress ? {
            currentPosition: progress.currentPosition,
            completed: progress.completed,
            watchedDuration: progress.watchedDuration,
            lastWatched: progress.lastWatched,
            currentPose: progress.currentPose
          } : null
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching video',
      error: error.message
    });
  }
};

export default { getVideos, getVideoById };
