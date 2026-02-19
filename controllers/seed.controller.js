import User from '../models/User.model.js';
import Log from '../models/Log.model.js';
import Cycle from '../models/Cycle.model.js';
import Subscription from '../models/Subscription.model.js';
import Video from '../models/Video.model.js';
import GiftSubscription from '../models/GiftSubscription.model.js';
import Notification from '../models/Notification.model.js';
import CyclePhase from '../models/CyclePhase.model.js';
import Sequence from '../models/Sequence.model.js';
import Session from '../models/Session.model.js';
import Step from '../models/Step.model.js';
import Media from '../models/Media.model.js';
import UserProgress from '../models/UserProgress.model.js';
import VideoProgress from '../models/VideoProgress.model.js';
import Favorite from '../models/Favorite.model.js';
import CustomLog from '../models/CustomLog.model.js';
import CycleSwitchHistory from '../models/CycleSwitchHistory.model.js';
  
const ADMIN_EMAIL = 'admin@k360.com';
const ADMIN_PASSWORD = 'admin123';
const DEMO_PASSWORD = 'demo123';

// Real-looking names for test data
const FIRST_NAMES = [
  'Emma', 'Olivia', 'Sophia', 'Isabella', 'Mia', 'Charlotte', 'Amelia', 'Harper',
  'Evelyn', 'Abigail', 'Emily', 'Ella', 'Elizabeth', 'Sofia', 'Avery', 'Scarlett'
];
const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Moore'
];

const DEMO_USERS = [
  { email: 'sarah.wilson@example.com', name: 'Sarah Wilson', birthYear: 1992 },
  { email: 'emma.martinez@example.com', name: 'Emma Martinez', birthYear: 1995 },
  { email: 'olivia.johnson@example.com', name: 'Olivia Johnson', birthYear: 1988 },
  { email: 'sophia.garcia@example.com', name: 'Sophia Garcia', birthYear: 1990 },
  { email: 'mia.anderson@example.com', name: 'Mia Anderson', birthYear: 1993 }
];

function getBaseUrl() {
  return (process.env.SERVER_URL || process.env.BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
}

/** Date helpers: use latest/current dates */
function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}
function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Seed all data: admin, users, cycle phases, sequences, sessions, steps, media,
 * videos, logs, cycles, subscriptions, gifts, notifications, progress, favorites, custom logs.
 * Uses real names and latest dates for testing all APIs.
 */
export async function runSeed(req, res) {
  try {
    const seeded = {
      admin: false,
      users: 0,
      cyclePhases: 0,
      sequences: 0,
      sessions: 0,
      steps: 0,
      media: 0,
      videos: 0,
      logs: 0,
      cycles: 0,
      subscriptions: 0,
      gifts: 0,
      notifications: 0,
      userProgress: 0,
      videoProgress: 0,
      favorites: 0,
      customLogs: 0
    };

    const baseUrl = getBaseUrl();

    // —— Admin ——
    let admin = await User.findOne({ email: ADMIN_EMAIL });
    if (!admin) {
      admin = await User.create({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        name: 'Alex Morgan',
        role: 'admin',
        onboardingCompleted: true,
        isActive: true,
        lastLogin: new Date()
      });
    }
    seeded.admin = true;
    const adminId = admin._id;

    // —— Demo users (real names) ——
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
          isActive: true,
          trackCycle: true,
          cycleType: 'regular',
          cycleLength: 28,
          periodLength: 5,
          lastLogin: daysAgo(Math.floor(Math.random() * 7))
        });
      }
      demoUserIds.push(usr._id);
    }
    seeded.users = demoUserIds.length;

    // —— Clear demo/test data (keep users and admin) ——
    await Log.deleteMany({});
    await Cycle.deleteMany({});
    await Subscription.deleteMany({});
    await GiftSubscription.deleteMany({});
    await Notification.deleteMany({});
    await Video.deleteMany({});
    await UserProgress.deleteMany({});
    await VideoProgress.deleteMany({});
    await Favorite.deleteMany({});
    await CustomLog.deleteMany({});
    await CycleSwitchHistory.deleteMany({});
    await Step.deleteMany({});
    await Session.deleteMany({});
    await Sequence.deleteMany({});
    await Media.deleteMany({});
    await CyclePhase.deleteMany({});

    // —— Cycle phases (admin content hierarchy) ——
    const phaseData = [
      { name: 'menstrual', displayName: 'Menstrual', description: 'Phase 1: Menstrual cycle support', order: 1 },
      { name: 'follicular', displayName: 'Follicular', description: 'Phase 2: Follicular phase', order: 2 },
      { name: 'ovulatory', displayName: 'Ovulatory', description: 'Phase 3: Ovulatory phase', order: 3 },
      { name: 'luteal', displayName: 'Luteal', description: 'Phase 4: Luteal phase', order: 4 }
    ];
    const insertedPhases = await CyclePhase.insertMany(phaseData);
    seeded.cyclePhases = insertedPhases.length;
    const phaseMap = Object.fromEntries(insertedPhases.map(p => [p.name, p._id]));

    // —— Media (used by steps) ——
    const mediaDocs = [];
    for (let i = 0; i < 12; i++) {
      mediaDocs.push({
        title: `Practice Video ${i + 1}`,
        description: `Guided practice clip for step ${i + 1}.`,
        mediaType: i % 3 === 0 ? 'video' : (i % 3 === 1 ? 'audio' : 'video'),
        filePath: `${baseUrl}/uploads/media/seed-practice-${i + 1}.mp4`,
        thumbnail: `${baseUrl}/uploads/thumbnails/seed-${i + 1}.jpg`,
        duration: 30 + i * 10,
        orientation: 'portrait',
        tags: ['yoga', 'meditation', 'breathwork'].slice(0, (i % 3) + 1),
        isActive: true,
        createdBy: adminId
      });
    }
    const insertedMedia = await Media.insertMany(mediaDocs);
    seeded.media = insertedMedia.length;

    // —— Sequences (one per phase) ——
    const sequenceDocs = [];
    const phaseNames = ['menstrual', 'follicular', 'ovulatory', 'luteal'];
    phaseNames.forEach((name, idx) => {
      sequenceDocs.push({
        cyclePhase: phaseMap[name],
        name: `sequence-${name}`,
        displayName: `${phaseData[idx].displayName} Flow`,
        description: `Full sequence for ${phaseData[idx].displayName} phase.`,
        order: idx + 1,
        totalDuration: 600,
        isActive: true,
        createdBy: adminId
      });
    });
    const insertedSequences = await Sequence.insertMany(sequenceDocs);
    seeded.sequences = insertedSequences.length;

    // —— Sessions (2 per sequence: yoga + meditation) ——
    const sessionDocs = [];
    const sessionTypes = ['yoga', 'meditation', 'workout', 'breathwork'];
    insertedSequences.forEach((seq, seqIdx) => {
      [0, 1].forEach((sessIdx) => {
        const st = sessionTypes[(seqIdx * 2 + sessIdx) % sessionTypes.length];
        sessionDocs.push({
          sequence: seq._id,
          sessionType: st,
          title: `${seq.displayName} – ${st.charAt(0).toUpperCase() + st.slice(1)}`,
          description: `${st} session for this phase.`,
          benefits: ['Relaxation', 'Focus', 'Energy'],
          difficulty: sessIdx === 0 ? 'beginner' : 'intermediate',
          duration: 300 + seqIdx * 60,
          equipment: 'Equipment-free',
          order: sessIdx + 1,
          isActive: true,
          isFree: sessIdx === 0,
          createdBy: adminId
        });
      });
    });
    const insertedSessions = await Session.insertMany(sessionDocs);
    seeded.sessions = insertedSessions.length;

    // —— Steps (2–3 per session, link to media) ——
    const stepDocs = [];
    insertedSessions.forEach((sess, sessIdx) => {
      const numSteps = 2 + (sessIdx % 2);
      for (let i = 0; i < numSteps; i++) {
        const mediaIdx = (sessIdx * 3 + i) % insertedMedia.length;
        stepDocs.push({
          session: sess._id,
          title: `Step ${i + 1}`,
          instructions: `Follow the guide for step ${i + 1}.`,
          media: insertedMedia[mediaIdx]._id,
          timer: 30 + i * 15,
          restTime: i === 0 ? 0 : 10,
          order: i + 1,
          isActive: true
        });
      }
    });
    const insertedSteps = await Step.insertMany(stepDocs);
    seeded.steps = insertedSteps.length;

    // —— Videos (legacy/direct videos for video APIs) ——
    const videoTitles = [
      'Morning Stretch', 'Follicular Flow', 'Ovulation Energy', 'Luteal Calm',
      'Menstrual Rest', 'Breathwork Basics', 'Evening Wind Down', 'Cycle Awareness',
      'Pelvic Floor Basics', 'Stress Relief', 'Sleep Meditation', 'Energy Boost'
    ];
    const videoCategories = ['menstrual', 'follicular', 'ovulation', 'luteal', 'general'];
    const videoPhases = ['menstrual', 'follicular', 'ovulation', 'luteal', 'all'];
    const demoVideos = videoTitles.map((title, i) => ({
      title,
      description: `Guided ${title.toLowerCase()} for your cycle.`,
      type: ['yoga', 'meditation', 'breathwork'][i % 3],
      category: videoCategories[i % videoCategories.length],
      phase: videoPhases[i % videoPhases.length],
      filePath: `${baseUrl}/uploads/assets/videos/seed-${i + 1}.mp4`,
      thumbnail: `${baseUrl}/uploads/assets/thumbnails/seed-${i + 1}.jpg`,
      duration: 300 + i * 60,
      durationMinutes: Math.ceil((300 + i * 60) / 60),
      equipment: 'Equipment-free',
      benefits: ['Relaxation', 'Focus', 'Energy'],
      isPremium: i >= 8,
      isActive: true,
      views: Math.floor(Math.random() * 500),
      createdBy: adminId
    }));
    const insertedVideos = await Video.insertMany(demoVideos);
    seeded.videos = insertedVideos.length;

    // —— Logs (last 90 days, all enum values, latest dates) ——
    const flowOptions = ['light', 'medium', 'heavy', 'spotting'];
    const phaseOptions = ['period', 'follicular', 'ovulation', 'luteal'];
    const moodOptions = ['happy', 'energetic', 'calm', 'sleepy', 'anxious', 'sad', 'guilty', 'angry'];
    const symptomOptions = ['fine', 'headache', 'cramps', 'cravings', 'acne', 'nausea', 'backache', 'bloating'];
    const logDocs = [];
    for (let d = 0; d < 90; d++) {
      const date = daysAgo(d);
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
        temperature: d % 5 === 0 ? { value: 97 + (d % 10) * 0.2, unit: 'fahrenheit' } : undefined,
        notes: d % 4 === 0 ? `Note for ${date.toISOString().slice(0, 10)}.` : undefined
      });
    }
    const insertedLogs = await Log.insertMany(logDocs);
    seeded.logs = insertedLogs.length;

    // —— Cycles (current + past, with ovulation & fertile window, latest dates) ——
    const cyclePhaseForCycle = ['menstrual', 'follicular', 'ovulation', 'luteal'];
    const cycleDocs = [];
    demoUserIds.forEach((userId, idx) => {
      for (let c = 1; c <= 3; c++) {
        const startDate = daysAgo(28 * (c - 1) + 5);
        const periodStart = new Date(startDate);
        const periodEnd = new Date(startDate);
        periodEnd.setDate(periodEnd.getDate() + 5);
        const cycleLength = 28;
        const ovulationDate = new Date(startDate);
        ovulationDate.setDate(ovulationDate.getDate() + 14);
        const fertileStart = new Date(ovulationDate);
        fertileStart.setDate(fertileStart.getDate() - 5);
        const fertileEnd = new Date(ovulationDate);
        fertileEnd.setDate(fertileEnd.getDate() + 1);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + cycleLength - 1);
        const isCurrent = c === 1;
        cycleDocs.push({
          user: userId,
          cycleNumber: c,
          startDate,
          endDate: isCurrent ? null : endDate,
          periodStartDate: periodStart,
          periodEndDate: periodEnd,
          cycleLength,
          periodLength: 5,
          ovulationDate,
          fertileWindowStart: fertileStart,
          fertileWindowEnd: fertileEnd,
          phase: cyclePhaseForCycle[(c + idx) % 4],
          isPredicted: true,
          notes: isCurrent ? 'Current cycle' : undefined
        });
      }
    });
    const insertedCycles = await Cycle.insertMany(cycleDocs);
    seeded.cycles = insertedCycles.length;

    // —— Subscriptions (free, monthly, yearly – latest dates) ——
    const now = new Date();
    const subPlans = [
      { plan: 'free', price: 0, isActive: true, isTrial: false },
      { plan: 'monthly', price: 9.99, isActive: true, isTrial: false },
      { plan: 'yearly', price: 79.99, isActive: true, isTrial: false },
      { plan: 'monthly', price: 9.99, isActive: true, isTrial: true },
      { plan: 'yearly', price: 79.99, isActive: true, isTrial: true }
    ];
    const subDocs = demoUserIds.slice(0, 5).map((userId, i) => {
      const s = subPlans[i % subPlans.length];
      const start = new Date(now);
      start.setMonth(start.getMonth() - (i % 2 === 0 ? 2 : 1));
      const end = new Date(start);
      end.setMonth(end.getMonth() + (s.plan === 'yearly' ? 12 : 1));
      return {
        user: userId,
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

    // —— Gift subscriptions (pending, active, redeemed) ——
    const giftDocs = [
      { recipientIdx: 0, senderIdx: 1, plan: 'monthly', status: 'active', message: 'Gift from Emma to Sarah' },
      { recipientIdx: 1, senderIdx: 2, plan: 'yearly', status: 'redeemed', message: 'Happy holidays!' },
      { recipientIdx: 2, senderIdx: 0, plan: 'monthly', status: 'pending', message: 'Welcome gift' }
    ].map((g, i) => {
      const giftedAt = daysAgo((i + 1) * 3);
      return {
        recipient: demoUserIds[g.recipientIdx],
        sender: demoUserIds[g.senderIdx],
        partnerCode: `GIFT${1000 + i}`,
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

    // —— Notifications (all types, latest dates, read/unread) ——
    const notifTypes = ['period_reminder', 'ovulation_reminder', 'log_reminder', 'yoga_reminder', 'meditation_reminder', 'subscription', 'general'];
    const notifDocs = [];
    demoUserIds.forEach((userId, i) => {
      notifTypes.forEach((type, j) => {
        const n = i * notifTypes.length + j;
        const scheduledFor = daysAgo(n % 14);
        scheduledFor.setHours(10, 0, 0, 0);
        const isRead = n % 2 === 0;
        notifDocs.push({
          user: userId,
          type,
          title: `${type.replace(/_/g, ' ')}`,
          message: `Reminder for ${type.replace(/_/g, ' ')}.`,
          isRead,
          readAt: isRead ? new Date() : undefined,
          scheduledFor,
          sentAt: isRead ? scheduledFor : undefined
        });
      });
    });
    const insertedNotifs = await Notification.insertMany(notifDocs);
    seeded.notifications = insertedNotifs.length;

    // —— User progress (sessions started/completed, latest dates) ——
    const progressDocs = [];
    demoUserIds.forEach((userId, userIdx) => {
      insertedSessions.slice(0, 4).forEach((sess, sessIdx) => {
        const completed = (userIdx + sessIdx) % 2 === 0;
        const startedAt = daysAgo(sessIdx);
        progressDocs.push({
          user: userId,
          session: sess._id,
          sessionStarted: true,
          sessionStartedAt: startedAt,
          sessionCompleted: completed,
          sessionCompletedAt: completed ? new Date(startedAt.getTime() + 300000) : undefined,
          timeSpent: completed ? 300 : 60 + sessIdx * 30,
          lastStepIndex: completed ? 3 : sessIdx,
          completedSteps: completed ? [{ step: insertedSteps[0]._id, completedAt: new Date(), timeSpent: 60 }] : []
        });
      });
    });
    const insertedProgress = await UserProgress.insertMany(progressDocs);
    seeded.userProgress = insertedProgress.length;

    // —— Video progress (currentPosition, completed, lastWatched – latest) ——
    const vpDocs = [];
    demoUserIds.forEach((userId, userIdx) => {
      insertedVideos.slice(0, 5).forEach((video, vIdx) => {
        const completed = (userIdx + vIdx) % 3 === 0;
        vpDocs.push({
          user: userId,
          video: video._id,
          currentPosition: completed ? video.duration : Math.min(120, video.duration - 10),
          completed,
          completedAt: completed ? new Date() : undefined,
          watchedDuration: completed ? video.duration : 120 + vIdx * 30,
          lastWatched: daysAgo(vIdx)
        });
      });
    });
    const insertedVp = await VideoProgress.insertMany(vpDocs);
    seeded.videoProgress = insertedVp.length;

    // —— Favorites (user + session) ——
    const favDocs = [];
    demoUserIds.forEach((userId) => {
      insertedSessions.slice(0, 2).forEach((sess) => {
        favDocs.push({ user: userId, session: sess._id });
      });
    });
    const insertedFavs = await Favorite.insertMany(favDocs);
    seeded.favorites = insertedFavs.length;

    // —— Custom logs (one doc per user; mainTitle only in API response) ——
    const customLogDocs = [];
    demoUserIds.forEach((userId) => {
      customLogDocs.push({
        user: userId,
        log: [
          { logTitle: 'Energy', logimage: '' },
          { logTitle: 'Sleep', logimage: '' },
          { logTitle: 'Mood', logimage: '' }
        ]
      });
    });
    const insertedCustomLogs = await CustomLog.insertMany(customLogDocs);
    seeded.customLogs = insertedCustomLogs.length;

    return res.status(200).json({
      success: true,
      message: 'Seed completed. All data uses real names and latest dates.',
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
