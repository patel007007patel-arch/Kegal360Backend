import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { uploadVideoAndThumbnail, uploadThumbnail } from '../middleware/upload.middleware.js';
import { getAllUsers, getUserById, createUser, updateUser, deleteUser } from '../controllers/admin.controller/users.controller.js';
import { getDashboardStats } from '../controllers/admin.controller/dashboard.controller.js';
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

// Require multipart for video upload to avoid "Unexpected end of form" from busboy
const requireMultipart = (req, res, next) => {
  const contentType = (req.headers['content-type'] || '').toLowerCase();
  if (!contentType.includes('multipart/form-data')) {
    return res.status(400).json({
      success: false,
      message: 'Video upload requires multipart/form-data. Please select a video file and try again.'
    });
  }
  next();
};

// Normalize multer .fields() result to req.file + req.files for createVideo controller
const normalizeVideoUpload = (req, res, next) => {
  if (req.files?.video?.[0]) {
    req.file = req.files.video[0];
  }
  if (!req.files?.thumbnail) {
    req.files = req.files || {};
    req.files.thumbnail = [];
  }
  next();
};

router.post('/videos', requireMultipart, uploadVideoAndThumbnail, normalizeVideoUpload, videoController.createVideo);
router.put('/videos/:id', requireMultipart, uploadVideoAndThumbnail, normalizeVideoUpload, videoController.updateVideo);
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
