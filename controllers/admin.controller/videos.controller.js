import Video from '../../models/Video.model.js';
import VideoProgress from '../../models/VideoProgress.model.js';
import { uploadVideo, uploadThumbnail } from '../../middleware/upload.middleware.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base URL for video/thumbnail access (server URL + path)
const getServerUrl = () => {
  const base = (process.env.SERVER_URL || process.env.BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
  return base;
};
const ASSETS_VIDEOS = '/uploads/assets/videos';
const ASSETS_THUMBNAILS = '/uploads/assets/thumbnails';

const getLocalPathFromStoredPath = (storedPath) => {
  if (!storedPath) return null;
  const pathname = storedPath.startsWith('http') ? new URL(storedPath).pathname : storedPath;
  const relative = pathname.startsWith('/') ? pathname.slice(1) : pathname;
  return path.join(__dirname, '../..', relative);
};

export const getAllVideos = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search,
      type, 
      phase, 
      isPremium,
      isActive,
      dateFrom,
      dateTo
    } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (type) query.type = type;
    if (phase && phase !== 'all') query.phase = phase;
    if (isPremium !== undefined && isPremium !== '') query.isPremium = isPremium === 'true';
    if (isActive !== undefined && isActive !== '') query.isActive = isActive === 'true';
    
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.createdAt.$lte = new Date(dateTo);
      }
    }

    const videos = await Video.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Video.countDocuments(query);

    res.json({
      success: true,
      data: {
        videos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all videos error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching videos',
      error: error.message
    });
  }
};


export const updateVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    const currentVideo = await Video.findById(id);
    if (!currentVideo) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    if (typeof updateData.benefits === 'string' && updateData.benefits) {
      try {
        updateData.benefits = JSON.parse(updateData.benefits);
      } catch {
        updateData.benefits = [];
      }
    }
    if (typeof updateData.sequence === 'string' && updateData.sequence) {
      try {
        updateData.sequence = JSON.parse(updateData.sequence);
      } catch {
        updateData.sequence = null;
      }
    }
    if (typeof updateData.instructor === 'string' && updateData.instructor) {
      try {
        updateData.instructor = JSON.parse(updateData.instructor);
      } catch {
        updateData.instructor = null;
      }
    }
    if (typeof updateData.isPremium === 'string') {
      updateData.isPremium = updateData.isPremium === 'true';
    }
    if (typeof updateData.isActive === 'string') {
      updateData.isActive = updateData.isActive === 'true';
    }

    // New video file uploaded: delete old file and set new path
    if (req.file && req.file.fieldname === 'video') {
      if (currentVideo.filePath) {
        const oldPath = getLocalPathFromStoredPath(currentVideo.filePath);
        if (oldPath && fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      const baseUrl = getServerUrl();
      updateData.filePath = `${baseUrl}${ASSETS_VIDEOS}/${req.file.filename}`;
      if (typeof updateData.duration === 'string' && updateData.duration) {
        updateData.duration = parseInt(updateData.duration, 10) || currentVideo.duration;
        updateData.durationMinutes = Math.round((updateData.duration || 0) / 60);
      } else if (updateData.duration === undefined) {
        updateData.duration = currentVideo.duration;
        updateData.durationMinutes = currentVideo.durationMinutes;
      }
    }

    // New thumbnail uploaded
    if (req.files && req.files.thumbnail && req.files.thumbnail.length > 0) {
      updateData.thumbnail = `${getServerUrl()}${ASSETS_THUMBNAILS}/${req.files.thumbnail[0].filename}`;
    }

    const video = await Video.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    res.json({
      success: true,
      message: 'Video updated successfully',
      data: {
        video
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating video',
      error: error.message
    });
  }
};

export const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Delete file from local assets folder
    if (video.filePath) {
      const localPath = getLocalPathFromStoredPath(video.filePath);
      if (localPath && fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
    }

    await Video.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Video deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting video',
      error: error.message
    });
  }
};

export const getVideoStats = async (req, res) => {
  try {
    const { id } = req.params;

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    const totalViews = video.views;
    const totalProgress = await VideoProgress.countDocuments({ video: id });
    const completedViews = await VideoProgress.countDocuments({ video: id, completed: true });

    res.json({
      success: true,
      data: {
        stats: {
          totalViews,
          totalProgress,
          completedViews,
          completionRate: totalProgress > 0 ? (completedViews / totalProgress * 100).toFixed(2) : 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching video stats',
      error: error.message
    });
  }
};

const createVideo = async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      category,
      phase,
      duration,
      equipment,
      benefits,
      isPremium,
      sequence,
      instructor
    } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Video file is required'
      });
    }

    const durationMinutes = Math.round((parseInt(duration) || 0) / 60);
    const baseUrl = getServerUrl();

    const video = new Video({
      title,
      description,
      type,
      category: category || 'general',
      phase: phase || 'all',
      filePath: `${baseUrl}${ASSETS_VIDEOS}/${req.file.filename}`,
      duration: parseInt(duration) || 0,
      durationMinutes,
      equipment: equipment || 'Equipment-free',
      benefits: benefits ? JSON.parse(benefits) : [],
      isPremium: isPremium === 'true',
      isActive: true,
      sequence: sequence ? JSON.parse(sequence) : null,
      instructor: instructor ? JSON.parse(instructor) : null,
      createdBy: req.user._id
    });

    if (req.files && req.files.thumbnail && req.files.thumbnail.length > 0) {
      video.thumbnail = `${baseUrl}${ASSETS_THUMBNAILS}/${req.files.thumbnail[0].filename}`;
    }

    await video.save();

    res.status(201).json({
      success: true,
      message: 'Video created successfully',
      data: {
        video
      }
    });
  } catch (error) {
    console.error('Create video error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating video',
      error: error.message
    });
  }
};

export default { getAllVideos, createVideo, updateVideo, deleteVideo, getVideoStats };
