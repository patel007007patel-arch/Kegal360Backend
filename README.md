# K360 Backend API

Backend API for K360 Period Tracking App built with Node.js, Express, and MongoDB.

## Features

- ✅ User Authentication (JWT, Social Login - Google/Apple)
- ✅ Role-based Access Control (Admin/User)
- ✅ Cycle Tracking & Logging
- ✅ Video Management (Upload, Progress Tracking, Resume)
- ✅ Subscription Management
- ✅ Notification System (Reminders, Push Notifications)
- ✅ Partner Sharing
- ✅ Yoga & Meditation Sessions
- ✅ Cycle Insights & Analytics
- ✅ Admin Panel APIs

## Tech Stack

- **Runtime**: Node.js (ES6 Modules)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT, Passport.js
- **File Upload**: Multer
- **Scheduling**: node-cron

## Project Structure

```
WH&CBackend/
├── controllers/          # Request handlers
│   ├── auth.controller/
│   ├── user.controller/
│   ├── cycle.controller/
│   ├── video.controller/
│   ├── subscription.controller/
│   ├── notification.controller/
│   ├── partner.controller/
│   └── admin.controller/
├── models/              # MongoDB models
├── routes/              # API routes
├── middleware/          # Custom middleware
│   ├── auth.middleware.js
│   └── upload.middleware.js
├── services/            # Business logic
├── utils/              # Utility functions
│   ├── jwt.js
│   ├── db.js
│   └── notificationScheduler.js
├── uploads/             # Uploaded files
│   ├── videos/
│   ├── images/
│   └── thumbnails/
└── server.js            # Entry point
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
- MongoDB connection string
- JWT secret
- Social login credentials
- Email settings

4. Start MongoDB (if running locally):
```bash
mongod
```

5. Run the server:
```bash
npm start
# or for development with auto-reload
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/social-login` - Social login (Google/Apple)
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `GET /api/users/onboarding/questions` - Get onboarding questions
- `POST /api/users/onboarding/complete` - Complete onboarding

### Cycles & Logs
- `POST /api/logs` - Create/update log
- `GET /api/logs` - Get logs
- `GET /api/cycles/calendar` - Get calendar data

### Videos
- `GET /api/videos` - Get videos
- `GET /api/videos/:id` - Get video by ID
- `POST /api/videos/progress` - Update video progress
- `GET /api/videos/progress/:videoId` - Get video progress

### Subscriptions
- `POST /api/subscriptions` - Create subscription
- `GET /api/subscriptions` - Get user subscription
- `POST /api/subscriptions/cancel` - Cancel subscription

### Notifications
- `GET /api/notifications` - Get notifications
- `POST /api/notifications` - Create notification
- `PUT /api/notifications/:id/read` - Mark as read

### Partner Sharing
- `GET /api/partners/code` - Generate share code
- `POST /api/partners/connect` - Connect with partner
- `GET /api/partners/shared` - Get shared data

### Admin (Requires Admin Role)
- `GET /api/admin/dashboard/stats` - Dashboard statistics
- `GET /api/admin/users` - Get all users
- `GET /api/admin/videos` - Get all videos
- `POST /api/admin/videos` - Create video
- `PUT /api/admin/videos/:id` - Update video
- `DELETE /api/admin/videos/:id` - Delete video

## Environment Variables

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/k360
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:3000
```

## Database Models

- **User**: User accounts, settings, subscription
- **Cycle**: Menstrual cycles
- **Log**: Daily logs (mood, symptoms, flow, etc.)
- **Video**: Yoga/meditation videos
- **VideoProgress**: Video watching progress
- **Subscription**: User subscriptions
- **Notification**: User notifications
- **Question**: Onboarding questions
- **UserAnswer**: User answers to questions
- **YogaSession**: Yoga practice sessions
- **MeditationSession**: Meditation sessions

## Authentication

All protected routes require a JWT token in the header:
```
Authorization: Bearer <token>
```

Admin routes require the user to have `role: 'admin'`.

## File Uploads

Videos are stored in `uploads/videos/` directory.
Thumbnails are stored in `uploads/thumbnails/` directory.

## Notification System

The system automatically schedules:
- Period reminders (1 day before expected period)
- Daily log reminders (8 PM if not logged)

## License

ISC
