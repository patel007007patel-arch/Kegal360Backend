import User from '../models/User.model.js';
import Log from '../models/Log.model.js';
import Cycle from '../models/Cycle.model.js';
import Subscription from '../models/Subscription.model.js';
import Video from '../models/Video.model.js';
import GiftSubscription from '../models/GiftSubscription.model.js';
import Notification from '../models/Notification.model.js';

const ADMIN_EMAIL = 'admin@k360.com';
const ADMIN_PASSWORD = 'admin123';

const DEMO_USERS = [
  { email: 'demo1@k360.com', name: 'Demo User One', birthYear: 1995 },
  { email: 'demo2@k360.com', name: 'Demo User Two', birthYear: 1990 },
  { email: 'demo3@k360.com', name: 'Demo User Three', birthYear: 1988 }
];
const DEMO_PASSWORD = 'demo123';

function getBaseUrl() {
  return (process.env.SERVER_URL || process.env.BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
}

/**
 * Run seed: admin, demo users, videos, logs, cycles, subscriptions, gifts, notifications.
 * Onboarding data is stored in User model only (no Question model).
 * Returns { success, message, seeded: { admin, users, videos, logs, cycles, subscriptions, gifts, notifications } }.
 */
export async function runSeed(req, res) {
  try {
    const seeded = {
      admin: false,
      users: 0,
      videos: 0,
      logs: 0,
      cycles: 0,
      subscriptions: 0,
      gifts: 0,
      notifications: 0
    };

    // —— Admin (plain password; User pre-save will hash) ——
    let admin = await User.findOne({ email: ADMIN_EMAIL });
    if (!admin) {
      admin = await User.create({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        name: 'Admin User',
        role: 'admin',
        onboardingCompleted: true,
        isActive: true
      });
    }
    seeded.admin = true;
    const adminId = admin._id;

    // —— Demo users (upsert by email so we get stable ids) ——
    const demoUserIds = [];
    for (const u of DEMO_USERS) {
      let usr = await User.findOne({ email: u.email });
      if (!usr) {
        usr = await User.create({
          email: u.email,
          password: DEMO_PASSWORD,
          name: u.name,
          birthYear: u.birthYear,
          role: 'user',
          onboardingCompleted: true,
          isActive: true
        });
      }
      demoUserIds.push(usr._id);
    }
    seeded.users = demoUserIds.length;

    // —— Clear demo-related data (keep users/admin) ——
    await Log.deleteMany({});
    await Cycle.deleteMany({});
    await Subscription.deleteMany({});
    await GiftSubscription.deleteMany({});
    await Notification.deleteMany({});
    await Video.deleteMany({});

    const baseUrl = getBaseUrl();

    // —— Demo videos (placeholder paths; list pages will show rows) ——
    const demoVideos = [
      { title: 'Morning Stretch', type: 'yoga', category: 'general', phase: 'all', duration: 600, durationMinutes: 10 },
      { title: 'Follicular Flow', type: 'yoga', category: 'follicular', phase: 'follicular', duration: 900, durationMinutes: 15 },
      { title: 'Ovulation Energy', type: 'yoga', category: 'ovulation', phase: 'ovulation', duration: 720, durationMinutes: 12 },
      { title: 'Luteal Calm', type: 'meditation', category: 'luteal', phase: 'luteal', duration: 600, durationMinutes: 10 },
      { title: 'Menstrual Rest', type: 'meditation', category: 'menstrual', phase: 'menstrual', duration: 540, durationMinutes: 9 },
      { title: 'Breathwork Basics', type: 'breathwork', category: 'general', phase: 'all', duration: 300, durationMinutes: 5 },
      { title: 'Evening Wind Down', type: 'meditation', category: 'general', phase: 'all', duration: 900, durationMinutes: 15 },
      { title: 'Cycle Awareness', type: 'yoga', category: 'general', phase: 'all', duration: 1200, durationMinutes: 20, isPremium: true }
    ].map((v, i) => ({
      title: v.title,
      description: `Demo ${v.type} for ${v.category} phase.`,
      type: v.type,
      category: v.category,
      phase: v.phase,
      filePath: `${baseUrl}/uploads/assets/videos/demo-${i + 1}.mp4`,
      thumbnail: `${baseUrl}/uploads/assets/thumbnails/demo-${i + 1}.jpg`,
      duration: v.duration,
      durationMinutes: v.durationMinutes,
      equipment: 'Equipment-free',
      benefits: ['Relaxation', 'Focus'],
      isPremium: !!v.isPremium,
      isActive: true,
      createdBy: adminId
    }));
    const insertedVideos = await Video.insertMany(demoVideos);
    seeded.videos = insertedVideos.length;

    // —— Demo logs (spread over last 14 days, various phases/flows/moods) ——
    const flowOptions = ['light', 'medium', 'heavy', 'spotting'];
    const phaseOptions = ['period', 'follicular', 'ovulation', 'luteal'];
    const moodOptions = ['happy', 'energetic', 'calm', 'sleepy', 'anxious', 'sad'];
    const symptomOptions = ['fine', 'headache', 'cramps', 'cravings', 'bloating'];
    const logDocs = [];
    for (let d = 0; d < 14; d++) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      date.setHours(0, 0, 0, 0);
      const userIdx = d % demoUserIds.length;
      const phase = phaseOptions[d % phaseOptions.length];
      const flow = phase === 'period' ? flowOptions[d % flowOptions.length] : null;
      logDocs.push({
        user: demoUserIds[userIdx],
        date,
        flow: flow || undefined,
        phase,
        mood: [moodOptions[d % moodOptions.length]],
        symptoms: [symptomOptions[d % symptomOptions.length]],
        notes: d % 3 === 0 ? 'Demo note for this day.' : undefined
      });
    }
    const insertedLogs = await Log.insertMany(logDocs);
    seeded.logs = insertedLogs.length;

    // —— Demo cycles (one past, one current per demo user) ——
    const cycleDocs = [];
    demoUserIds.forEach((userId, idx) => {
      const start1 = new Date();
      start1.setDate(start1.getDate() - 35);
      start1.setHours(0, 0, 0, 0);
      const periodStart1 = new Date(start1);
      const periodEnd1 = new Date(start1);
      periodEnd1.setDate(periodEnd1.getDate() + 5);
      const end1 = new Date(start1);
      end1.setDate(end1.getDate() + 28);
      cycleDocs.push({
        user: userId,
        cycleNumber: 1,
        startDate: start1,
        endDate: end1,
        periodStartDate: periodStart1,
        periodEndDate: periodEnd1,
        cycleLength: 28,
        periodLength: 5,
        phase: 'luteal',
        isPredicted: true
      });
      const start2 = new Date();
      start2.setDate(start2.getDate() - 7);
      start2.setHours(0, 0, 0, 0);
      const periodStart2 = new Date(start2);
      const periodEnd2 = new Date(start2);
      periodEnd2.setDate(periodEnd2.getDate() + 5);
      cycleDocs.push({
        user: userId,
        cycleNumber: 2,
        startDate: start2,
        endDate: null,
        periodStartDate: periodStart2,
        periodEndDate: periodEnd2,
        cycleLength: 28,
        periodLength: 5,
        phase: idx === 0 ? 'follicular' : idx === 1 ? 'ovulation' : 'luteal',
        isPredicted: true
      });
    });
    const insertedCycles = await Cycle.insertMany(cycleDocs);
    seeded.cycles = insertedCycles.length;

    // —— Demo subscriptions (one per demo user: free, monthly, yearly) ——
    const now = new Date();
    const subDocs = [
      { plan: 'free', price: 0, isActive: true, isTrial: false },
      { plan: 'monthly', price: 9.99, isActive: true, isTrial: false },
      { plan: 'yearly', price: 79.99, isActive: true, isTrial: true }
    ].map((s, i) => {
      const start = new Date(now);
      start.setMonth(start.getMonth() - (i === 0 ? 2 : 1));
      const end = new Date(start);
      end.setMonth(end.getMonth() + (s.plan === 'yearly' ? 12 : 1));
      return {
        user: demoUserIds[i],
        plan: s.plan,
        price: s.price,
        startDate: start,
        endDate: end,
        isActive: s.isActive,
        isTrial: s.isTrial,
        trialEndDate: s.isTrial ? end : undefined,
        autoRenew: true
      };
    });
    const insertedSubs = await Subscription.insertMany(subDocs);
    seeded.subscriptions = insertedSubs.length;

    // —— Demo gifts (recipient/sender among demo users) ——
    const giftDocs = [
      { recipientIdx: 0, senderIdx: 1, plan: 'monthly', status: 'active', message: 'Gift from Demo 2 to Demo 1' },
      { recipientIdx: 1, senderIdx: 2, plan: 'yearly', status: 'redeemed', message: 'Yearly gift' }
    ].map((g, i) => {
      const giftedAt = new Date();
      giftedAt.setDate(giftedAt.getDate() - (i + 1) * 5);
      return {
        recipient: demoUserIds[g.recipientIdx],
        sender: demoUserIds[g.senderIdx],
        partnerCode: `DEMO${100 + i}`,
        plan: g.plan,
        duration: g.plan === 'yearly' ? 12 : 1,
        status: g.status,
        message: g.message,
        giftedAt,
        amount: g.plan === 'yearly' ? 79.99 : 9.99,
        redeemedAt: g.status === 'redeemed' ? new Date() : undefined,
        redeemedBy: g.status === 'redeemed' ? demoUserIds[g.recipientIdx] : undefined
      };
    });
    const insertedGifts = await GiftSubscription.insertMany(giftDocs);
    seeded.gifts = insertedGifts.length;

    // —— Demo notifications ——
    const notifTypes = ['period_reminder', 'ovulation_reminder', 'log_reminder', 'yoga_reminder', 'general'];
    const notifDocs = [];
    demoUserIds.forEach((userId, i) => {
      notifTypes.forEach((type, j) => {
        const n = i * notifTypes.length + j;
        const scheduled = new Date();
        scheduled.setDate(scheduled.getDate() - n);
        scheduled.setHours(10, 0, 0, 0);
        notifDocs.push({
          user: userId,
          type,
          title: `Demo ${type.replace(/_/g, ' ')}`,
          message: `Demo notification #${n + 1} for user.`,
          isRead: n % 2 === 0,
          readAt: n % 2 === 0 ? new Date() : undefined,
          scheduledFor: scheduled,
          sentAt: n % 2 === 0 ? scheduled : undefined
        });
      });
    });
    const insertedNotifs = await Notification.insertMany(notifDocs);
    seeded.notifications = insertedNotifs.length;

    return res.status(200).json({
      success: true,
      message: 'Seed completed',
      seeded
    });
  } catch (error) {
    console.error('Seed error:', error);
    return res.status(500).json({
      success: false,
      message: 'Seed failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
