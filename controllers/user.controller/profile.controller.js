import User from '../../models/User.model.js';
import Cycle from '../../models/Cycle.model.js';
import { getEffectiveCycleLength } from '../../services/cycleCalculation.service.js';

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Build user object for response: include partnerCode only if registered for "myself" and onboarding completed
    const userObj = user.toObject ? user.toObject() : { ...user };
    const includePartnerCode = user.onboardingCompleted && user.appFor === 'myself';
    if (!includePartnerCode && userObj.partnerCode !== undefined) {
      delete userObj.partnerCode;
    }
    if (includePartnerCode && userObj.partnerCode) {
      userObj.shareLink = `${process.env.FRONTEND_URL || ''}/connect?code=${userObj.partnerCode}`;
    }

    const data = { user: userObj };

    // Jill's Cycle Insights: cycle range, average cycle length, period range, average period length
    if (user.trackCycle && user.cycleType !== 'absent') {
      const cycles = await Cycle.find({ user: user._id }).sort({ startDate: -1 }).limit(24).lean();
      const cycleLengths = cycles.map(c => c.cycleLength).filter(Boolean);
      const periodLengths = cycles.map(c => c.periodLength).filter(Boolean);

      const effectiveLen = getEffectiveCycleLength(user);
      const cycleRange = user.cycleType === 'irregular' && user.cycleLengthRange?.min != null && user.cycleLengthRange?.max != null
        ? `${user.cycleLengthRange.min}-${user.cycleLengthRange.max} days`
        : cycleLengths.length > 0
          ? `${Math.min(...cycleLengths)}-${Math.max(...cycleLengths)} days`
          : `${user.cycleLength ?? 28} days`;
      const averageCycleLength = cycleLengths.length > 0
        ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length)
        : effectiveLen;
      const periodRange = periodLengths.length > 0
        ? `${Math.min(...periodLengths)}-${Math.max(...periodLengths)} days`
        : user.periodLength != null ? `${user.periodLength}-${user.periodLength} days` : '5-7 days';
      const averagePeriodLength = periodLengths.length > 0
        ? Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length)
        : (user.periodLength ?? 5);

      data.cycleInsights = {
        cycleRange,
        averageCycleLength,
        periodRange,
        averagePeriodLength
      };
    } else {
      data.cycleInsights = null;
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, birthYear, settings } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (birthYear) updateData.birthYear = birthYear;
    if (settings) updateData.settings = { ...req.user.settings, ...settings };

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    ).select('-password');

    const userObj = user.toObject ? user.toObject() : { ...user };
    const includePartnerCode = user.onboardingCompleted && user.appFor === 'myself';
    if (!includePartnerCode && userObj.partnerCode !== undefined) {
      delete userObj.partnerCode;
    }
    if (includePartnerCode && userObj.partnerCode) {
      userObj.shareLink = `${process.env.FRONTEND_URL || ''}/connect?code=${userObj.partnerCode}`;
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: userObj
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
};

export default { getProfile, updateProfile };
