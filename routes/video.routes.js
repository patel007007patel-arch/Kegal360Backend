import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { uploadVideo } from '../middleware/upload.middleware.js';
import uploadVideoController from '../controllers/video.controller/upload.controller.js';
import { getVideos, getVideoById } from '../controllers/video.controller/getVideos.controller.js';
import { updateProgress, getProgress } from '../controllers/video.controller/progress.controller.js';

const router = express.Router();

router.use(authenticate);

// Get videos
router.get('/', getVideos);
router.get('/:id', getVideoById);

// Upload video (admin only - will add authorization later)
router.post('/upload', uploadVideo.single('video'), uploadVideoController);

// Progress tracking
router.post('/progress', updateProgress);
router.get('/progress/:videoId', getProgress);

export default router;
