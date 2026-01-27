import express from 'express';
import { runSeed } from '../controllers/seed.controller.js';

const router = express.Router();

/**
 * Allow seed only in development OR when x-seed-secret header matches SEED_SECRET.
 * In production, set SEED_SECRET in env and send: x-seed-secret: <value>
 */
const allowSeed = (req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development';
  const secret = process.env.SEED_SECRET;
  const headerSecret = req.get('x-seed-secret');

  if (isDev || (secret && headerSecret === secret)) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Seed is disabled. Use development mode or provide x-seed-secret.'
  });
};

router.post('/', allowSeed, runSeed);

export default router;
