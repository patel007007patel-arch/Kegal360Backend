import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import cycleRoutes from './routes/cycle.routes.js';
import logRoutes from './routes/log.routes.js';
import periodRoutes from './routes/period.routes.js';
import videoRoutes from './routes/video.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import adminRoutes from './routes/admin.routes.js';
import partnerRoutes from './routes/partner.routes.js';
import sessionRoutes from './routes/session.routes.js';
import progressRoutes from './routes/progress.routes.js';
import favoriteRoutes from './routes/favorite.routes.js';
import insightsRoutes from './routes/insights.routes.js';
import customLogRoutes from './routes/customLog.routes.js';
import seedRoutes from './routes/seed.routes.js';

// Import notification scheduler
import { initializeSchedulers } from './utils/notificationScheduler.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS: allow multiple origins (comma-separated FRONTEND_URL). Each normalized (no trailing slash).
const defaultOrigins = ['http://localhost:3000', 'https://kegal360-frontned.vercel.app'];
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean)
  : defaultOrigins;
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(null, false);
  },
  credentials: true
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/k360', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cycles', cycleRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/period', periodRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/partners', partnerRoutes);
// Unified session system
app.use('/api/sessions', sessionRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/custom-logs', customLogRoutes);
app.use('/api/seed', seedRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'K360 Backend API is running' });
});

// Test login endpoint (for debugging)
app.post('/api/auth/login/test', (req, res) => {
  console.log('🧪 Test login endpoint hit!');
  console.log('📦 Request body:', req.body);
  res.json({ 
    success: true, 
    message: 'Test endpoint working',
    received: req.body 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler (include path for debugging)
app.use((req, res) => {
  console.warn(`⚠️ 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Initialize notification schedulers
  initializeSchedulers();
});

export default app;
