import Video from '../../models/Video.model.js';
import VideoProgress from '../../models/VideoProgress.model.js';
import { uploadVideo, uploadThumbnail } from '../../middleware/upload.middleware.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    const updateData = req.body;

    if (updateData.benefits) {
      updateData.benefits = JSON.parse(updateData.benefits);
    }
    if (updateData.sequence) {
      updateData.sequence = JSON.parse(updateData.sequence);
    }
    if (updateData.instructor) {
      updateData.instructor = JSON.parse(updateData.instructor);
    }

    if (req.files && req.files.thumbnail) {
      updateData.thumbnail = `/uploads/thumbnails/${req.files.thumbnail[0].filename}`;
    }

    const video = await Video.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

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

    // Delete file
    if (video.filePath) {
      const filePath = path.join(__dirname, '..', video.filePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
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

    const video = new Video({
      title,
      description,
      type,
      category: category || 'general',
      phase: phase || 'all',
      filePath: `/uploads/videos/${req.file.filename}`,
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
      video.thumbnail = `/uploads/thumbnails/${req.files.thumbnail[0].filename}`;
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
