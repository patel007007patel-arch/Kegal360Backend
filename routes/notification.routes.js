import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { createNotification } from '../controllers/notification.controller/create.controller.js';
import { getNotifications, markAsRead, markAllAsRead, updateNotification, deleteNotification } from '../controllers/notification.controller/get.controller.js';

const router = express.Router();

router.use(authenticate);

router.post('/', createNotification);
router.get('/', getNotifications);
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);
router.put('/:id', updateNotification); // Update notification (admin can update any)
router.delete('/:id', deleteNotification); // Delete notification (admin only)

export default router;
