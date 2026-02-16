import User from '../../models/User.model.js';
import CycleSwitchHistory from '../../models/CycleSwitchHistory.model.js';

/**
 * Onboarding: app sends answers directly in body; API stores all in User.
 * Questions/steps are static in the app — no config endpoint. Only this complete API.
 *
 * Body fields (app uses its own step order; send same field names):
 * name, birthYear, appFor, trackCycle, cycleType, cycleLength, cycleLengthRange,
 * periodLength, lastPeriodStart, lastPeriodEnd
 */
export const completeOnboarding = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      name,
      birthYear,
      appFor,
      trackCycle,
      cycleType,
      cycleLength,
      periodLength,
      cycleLengthRange,
      lastPeriodStart,
      lastPeriodEnd
    } = req.body;

    const updateData = {
      onboardingCompleted: true,
      appFor: appFor === 'partner' ? 'partner' : 'myself'
    };

    if (name != null && String(name).trim()) {
      updateData.name = String(name).trim();
    }
    if (birthYear != null) {
      const y = parseInt(birthYear, 10);
      if (!isNaN(y)) updateData.birthYear = y;
    }
    if (trackCycle !== undefined) {
      updateData.trackCycle = !!trackCycle;
    }
    if (cycleType && ['regular', 'irregular', 'absent'].includes(cycleType)) {
      updateData.cycleType = cycleType;
    }
    if (cycleLength != null) {
      const n = parseInt(cycleLength, 10);
      if (!isNaN(n)) {
        if (updateData.cycleType === 'absent' || updateData.cycleType === 'irregular') {
          updateData.cycleLength = n;
        } else if (n >= 21 && n <= 45) {
          updateData.cycleLength = n;
        }
      }
    }
    if (periodLength != null) {
      const n = parseInt(periodLength, 10);
      if (!isNaN(n)) {
        if (updateData.cycleType === 'absent') {
          updateData.periodLength = n;
        } else {
          updateData.periodLength = Math.min(14, Math.max(1, n));
        }
      }
    }
    if (cycleLengthRange != null) {
      const min = Number(cycleLengthRange.min);
      const max = Number(cycleLengthRange.max);
      if (!isNaN(min) && !isNaN(max)) {
        updateData.cycleLengthRange = { min, max };
      }
    }
    if (lastPeriodStart != null && lastPeriodStart !== '' && String(lastPeriodStart) !== '0') {
      updateData.lastPeriodStart = new Date(lastPeriodStart);
      if (lastPeriodEnd != null && lastPeriodEnd !== '' && String(lastPeriodEnd) !== '0') {
        updateData.lastPeriodEnd = new Date(lastPeriodEnd);
      } else {
        const start = new Date(lastPeriodStart);
        start.setDate(start.getDate() + (updateData.periodLength ?? 5));
        updateData.lastPeriodEnd = start;
      }
    } else if (updateData.cycleType === 'absent') {
      updateData.lastPeriodStart = null;
      updateData.lastPeriodEnd = null;
    }

    await User.findByIdAndUpdate(userId, { $set: updateData });

    const user = await User.findById(userId);
    if (user && !user.partnerCode) {
      await user.generatePartnerCode();
      await user.save();
    }

    const updatedUser = await User.findById(userId).select('-password');

    // Always create switch history on first-time onboarding so initial cycle choice is recorded
    await CycleSwitchHistory.create({
      user: userId,
      switchDate: new Date(),
      cycleType: updatedUser.cycleType,
      trackCycle: updatedUser.trackCycle,
      cycleLength: updatedUser.cycleLength,
      cycleLengthRange: updatedUser.cycleLengthRange,
      periodLength: updatedUser.periodLength ?? 5,
      lastPeriodStart: updatedUser.lastPeriodStart,
      lastPeriodEnd: updatedUser.lastPeriodEnd
    });

    const settings = {
      cycleType: updatedUser.cycleType || 'regular',
      trackCycle: updatedUser.trackCycle !== false,
      cycleLength: updatedUser.cycleLength != null ? updatedUser.cycleLength : (updatedUser.cycleType === 'absent' || updatedUser.cycleType === 'irregular' ? 0 : 28),
      cycleLengthRange: updatedUser.cycleLengthRange || null,
      periodLength: updatedUser.periodLength != null ? updatedUser.periodLength : (updatedUser.cycleType === 'absent' ? 0 : 5),
      lastPeriodStart: updatedUser.lastPeriodStart || null,
      lastPeriodEnd: updatedUser.lastPeriodEnd || null
    };

    res.json({
      success: true,
      message: 'Onboarding completed successfully',
      data: {
        user: updatedUser,
        settings
      }
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing onboarding',
      error: error.message
    });
  }
};

export default completeOnboarding;
