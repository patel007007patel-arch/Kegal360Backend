import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateObjectIdParam } from '../middleware/validateObjectId.middleware.js';
import {
  getFavorites,
  addFavorite,
  removeFavorite
} from '../controllers/favorite.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);
router.param('sessionId', validateObjectIdParam('sessionId'));

router.get('/', getFavorites);
router.post('/', addFavorite);
router.delete('/:sessionId', removeFavorite);

export default router;
