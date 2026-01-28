import cron from 'node-cron';
import Notification from '../models/Notification.model.js';
import User from '../models/User.model.js';
import Log from '../models/Log.model.js';
import Cycle from '../models/Cycle.model.js';
import { getEffectiveCycleLength } from '../services/cycleCalculation.service.js';

// Schedule period reminders (uses effective cycle length: regular → cycleLength, irregular → midpoint of cycleLengthRange)
export const schedulePeriodReminders = () => {
  // Run daily at 9 AM
  cron.schedule('0 9 * * *', async () => {
    try {
      const users = await User.find({
        'settings.pushNotifications': true,
        cycleType: { $in: ['regular', 'irregular'] }
      });

      for (const user of users) {
        if (!user.lastPeriodStart) continue;
        const cycleLength = getEffectiveCycleLength(user);
        const lastPeriod = new Date(user.lastPeriodStart);
        const nextPeriod = new Date(lastPeriod);
        nextPeriod.setDate(nextPeriod.getDate() + cycleLength);

        const today = new Date();
        const daysUntil = Math.ceil((nextPeriod - today) / (1000 * 60 * 60 * 24));

        // Send reminder 1 day before
        if (daysUntil === 1) {
          await Notification.create({
            user: user._id,
            type: 'period_reminder',
            title: 'Period Reminder',
            message: `Your period is expected to start tomorrow. Don't forget to log it!`,
            scheduledFor: new Date(),
            sentAt: new Date()
          });
        }
      }
    } catch (error) {
      console.error('Error scheduling period reminders:', error);
    }
  });
};

// Schedule log reminders
export const scheduleLogReminders = () => {
  // Run daily at 8 PM
  cron.schedule('0 20 * * *', async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const users = await User.find({
        'settings.pushNotifications': true
      });

      for (const user of users) {
        const hasLoggedToday = await Log.findOne({
          user: user._id,
          date: {
            $gte: today,
            $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
          }
        });

        if (!hasLoggedToday) {
          await Notification.create({
            user: user._id,
            type: 'log_reminder',
            title: 'Daily Log Reminder',
            message: "Don't forget to log how you're feeling today!",
            scheduledFor: new Date(),
            sentAt: new Date()
          });
        }
      }
    } catch (error) {
      console.error('Error scheduling log reminders:', error);
    }
  });
};

// Initialize all schedulers
export const initializeSchedulers = () => {
  schedulePeriodReminders();
  scheduleLogReminders();
  console.log('✅ Notification schedulers initialized');
};

export default { schedulePeriodReminders, scheduleLogReminders, initializeSchedulers };
