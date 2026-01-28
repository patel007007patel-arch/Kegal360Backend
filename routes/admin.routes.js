import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { uploadVideoAndThumbnail, requireMultipart, normalizeVideoUpload } from '../middleware/upload.middleware.js';
import { getAllUsers, getUserById, createUser, updateUser, deleteUser } from '../controllers/admin.controller/users.controller.js';
import { getDashboardStats } from '../controllers/admin.controller/dashboard.controller.js';
import videoController from '../controllers/admin.controller/videos.controller.js';
import * as cyclePhaseController from '../controllers/admin.controller/cyclePhase.controller.js';
import * as sequenceController from '../controllers/admin.controller/sequence.controller.js';
import * as sessionController from '../controllers/admin.controller/session.controller.js';
import * as stepController from '../controllers/admin.controller/step.controller.js';
import * as mediaController from '../controllers/admin.controller/media.controller.js';
import * as giftController from '../controllers/admin.controller/gift.controller.js';
import { getAdminLogs, deleteAdminLog } from '../controllers/admin.controller/logs.controller.js';
import { getAdminCycles, deleteAdminCycle } from '../controllers/admin.controller/cycles.controller.js';
import { getAdminSubscriptions, deleteAdminSubscription } from '../controllers/admin.controller/subscriptions.controller.js';
import { getAdminProfile, updateAdminProfile, changeAdminPassword } from '../controllers/admin.controller/profile.controller.js';
const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// Admin Profile & Settings
router.get('/profile', getAdminProfile);
router.put('/profile', updateAdminProfile);
router.put('/profile/change-password', changeAdminPassword);

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

router.post('/videos', requireMultipart, uploadVideoAndThumbnail, normalizeVideoUpload, videoController.createVideo);
router.put('/videos/:id', requireMultipart, uploadVideoAndThumbnail, normalizeVideoUpload, videoController.updateVideo);
router.delete('/videos/:id', videoController.deleteVideo);
router.get('/videos/:id/stats', videoController.getVideoStats);

// Cycle Phase Manager
router.get('/cycle-phases', cyclePhaseController.getAllCyclePhases);
router.get('/cycle-phases/:id', cyclePhaseController.getCyclePhaseById);
router.post('/cycle-phases', cyclePhaseController.createCyclePhase);
router.put('/cycle-phases/:id', cyclePhaseController.updateCyclePhase);
router.delete('/cycle-phases/:id', cyclePhaseController.deleteCyclePhase);

// Sequence Manager
router.get('/sequences', sequenceController.getAllSequences);
router.get('/sequences/:id', sequenceController.getSequenceById);
router.post('/sequences', sequenceController.createSequence);
router.put('/sequences/:id', sequenceController.updateSequence);
router.delete('/sequences/:id', sequenceController.deleteSequence);
router.post('/sequences/:id/duplicate', sequenceController.duplicateSequence);
router.post('/sequences/reorder', sequenceController.reorderSequences);

// Session Manager
router.get('/sessions', sessionController.getAllSessions);
router.get('/sessions/:id', sessionController.getSessionById);
router.post('/sessions', sessionController.createSession);
router.put('/sessions/:id', sessionController.updateSession);
router.delete('/sessions/:id', sessionController.deleteSession);
router.post('/sessions/reorder', sessionController.reorderSessions);

// Step / Pose Manager
router.get('/steps', stepController.getAllSteps);
router.get('/steps/:id', stepController.getStepById);
router.post('/steps', stepController.createStep);
router.put('/steps/:id', stepController.updateStep);
router.delete('/steps/:id', stepController.deleteStep);
router.post('/steps/reorder', stepController.reorderSteps);

// Media Manager (Video Library)
router.get('/media', mediaController.getAllMedia);
router.get('/media/:id', mediaController.getMediaById);
router.post('/media', requireMultipart, uploadVideoAndThumbnail, normalizeVideoUpload, mediaController.createMedia);
router.put('/media/:id', requireMultipart, uploadVideoAndThumbnail, normalizeVideoUpload, mediaController.updateMedia);
router.delete('/media/:id', mediaController.deleteMedia);

// Logs
router.get('/logs', getAdminLogs);
router.delete('/logs/:id', deleteAdminLog);

// Cycles
router.get('/cycles', getAdminCycles);
router.delete('/cycles/:id', deleteAdminCycle);

// Subscriptions
router.get('/subscriptions', getAdminSubscriptions);
router.delete('/subscriptions/:id', deleteAdminSubscription);

// Gifts
router.get('/gifts', giftController.getAllGifts);
router.get('/gifts/:id', giftController.getGiftById);
router.delete('/gifts/:id', giftController.deleteGift);

export default router;
