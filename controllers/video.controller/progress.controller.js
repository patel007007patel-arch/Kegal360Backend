import VideoProgress from '../../models/VideoProgress.model.js';

export const updateProgress = async (req, res) => {
  try {
    const { videoId, currentPosition, completed, watchedDuration, currentPose } = req.body;
    const userId = req.user._id;

    if (!videoId) {
      return res.status(400).json({
        success: false,
        message: 'Video ID is required'
      });
    }

    const progressData = {
      user: userId,
      video: videoId,
      currentPosition: currentPosition || 0,
      lastWatched: new Date()
    };

    if (completed !== undefined) {
      progressData.completed = completed;
      if (completed) {
        progressData.completedAt = new Date();
      }
    }

    if (watchedDuration !== undefined) {
      progressData.watchedDuration = watchedDuration;
    }

    if (currentPose) {
      progressData.currentPose = currentPose;
    }

    const progress = await VideoProgress.findOneAndUpdate(
      { user: userId, video: videoId },
      progressData,
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Progress updated successfully',
      data: {
        progress
      }
    });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating progress',
      error: error.message
    });
  }
};

export const getProgress = async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.user._id;

    const progress = await VideoProgress.findOne({
      user: userId,
      video: videoId
    });

    res.json({
      success: true,
      data: {
        progress: progress || {
          currentPosition: 0,
          completed: false,
          watchedDuration: 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching progress',
      error: error.message
    });
  }
};

export default { updateProgress, getProgress };
