import express from 'express';
import { getAllActiveMeditations } from '../controllers/meditation.controller.js';
import { getFavoriteMeditations, addFavoriteMeditation, removeFavoriteMeditation } from '../controllers/favoriteMeditation.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Favorite Meditations Routes (Requires Authentication)
router.get('/favorites', authenticate, getFavoriteMeditations);
router.post('/favorites/add', authenticate, addFavoriteMeditation);
router.post('/favorites/remove', authenticate, removeFavoriteMeditation);

// Public route to get all active meditations
router.get('/', getAllActiveMeditations);

export default router;
