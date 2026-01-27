import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { uploadVideo, uploadThumbnail } from '../middleware/upload.middleware.js';
import { getAllUsers, getUserById, createUser, updateUser, deleteUser, getDashboardStats } from '../controllers/admin.controller/users.controller.js';
import videoController from '../controllers/admin.controller/videos.controller.js';
import Video from '../models/Video.model.js';
import Log from '../models/Log.model.js';
import Cycle from '../models/Cycle.model.js';
import Subscription from '../models/Subscription.model.js';
import User from '../models/User.model.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// Dashboard
router.get('/dashboard/stats', getDashboardStats);

// Users
router.get('/users', getAllUsers);
router.post('/users', createUser);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Videos
router.get('/videos', videoController.getAllVideos);
// Custom middleware to handle both video and thumbnail uploads
const uploadVideoAndThumbnail = (req, res, next) => {
  // First upload video
  uploadVideo.single('video')(req, res, (err) => {
    if (err) return next(err);
    // Store video file before thumbnail overwrites it
    const videoFile = req.file;
    // Then upload thumbnail (if provided)
    uploadThumbnail.single('thumbnail')(req, res, (err) => {
      if (err) return next(err);
      // Restore video file to req.file
      req.file = videoFile;
      // Store thumbnail in req.files if it was uploaded
      const thumbnailFile = req.file && req.file.fieldname === 'thumbnail' ? req.file : null;
      if (thumbnailFile) {
        // Thumbnail overwrote req.file, so restore video and store thumbnail separately
        req.file = videoFile;
        req.files = { thumbnail: [thumbnailFile] };
      } else {
        // Only video was uploaded (or no thumbnail provided)
        req.file = videoFile;
        req.files = {};
      }
      next();
    });
  });
};

router.post('/videos', uploadVideoAndThumbnail, videoController.createVideo);
router.put('/videos/:id', uploadThumbnail.single('thumbnail'), videoController.updateVideo);
router.delete('/videos/:id', videoController.deleteVideo);
router.get('/videos/:id/stats', videoController.getVideoStats);

// Logs
router.get('/logs', async (req, res) => {
  try {
    const { page = 1, limit = 50, userId, phase, flow, mood, symptom, dateFrom, dateTo } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (userId) query.user = userId;
    if (phase) query.phase = phase;
    if (flow) query.flow = flow;
    if (mood) query.mood = { $in: [mood] };
    if (symptom) query.symptoms = { $in: [symptom] };
    
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) {
        query.date.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.date.$lte = new Date(dateTo);
      }
    }

    const logs = await Log.find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Log.countDocuments(query);

    res.json({
      success: true,
      data: {
        logs,
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
      message: 'Error fetching logs',
      error: error.message
    });
  }
});

// Cycles
router.get('/cycles', async (req, res) => {
  try {
    const { page = 1, limit = 50, userId } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (userId) query.user = userId;

    const cycles = await Cycle.find(query)
      .populate('user', 'name email')
      .sort({ startDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Cycle.countDocuments(query);

    res.json({
      success: true,
      data: {
        cycles,
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
      message: 'Error fetching cycles',
      error: error.message
    });
  }
});

// Subscriptions
router.get('/subscriptions', async (req, res) => {
  try {
    const { page = 1, limit = 50, plan, isActive, isTrial, dateFrom, dateTo } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (plan) query.plan = plan;
    if (isActive !== undefined && isActive !== '') query.isActive = isActive === 'true';
    if (isTrial !== undefined && isTrial !== '') query.isTrial = isTrial === 'true';
    
    if (dateFrom || dateTo) {
      query.startDate = {};
      if (dateFrom) {
        query.startDate.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.startDate.$lte = new Date(dateTo);
      }
    }

    const subscriptions = await Subscription.find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Subscription.countDocuments(query);

    res.json({
      success: true,
      data: {
        subscriptions,
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
      message: 'Error fetching subscriptions',
      error: error.message
    });
  }
});

// Gifts
router.get('/gifts', async (req, res) => {
  try {
    const { page = 1, limit = 50, status, plan, dateFrom, dateTo } = req.query;
    const skip = (page - 1) * limit;

    const GiftSubscription = (await import('../models/GiftSubscription.model.js')).default;

    let query = {};
    if (status) query.status = status;
    if (plan) query.plan = plan;
    
    if (dateFrom || dateTo) {
      query.giftedAt = {};
      if (dateFrom) {
        query.giftedAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.giftedAt.$lte = new Date(dateTo);
      }
    }

    const gifts = await GiftSubscription.find(query)
      .populate('recipient', 'name email')
      .populate('sender', 'name email')
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
});

export default router;
