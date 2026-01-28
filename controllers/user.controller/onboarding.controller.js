import User from '../../models/User.model.js';

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
      if (!isNaN(n) && n >= 21 && n <= 45) updateData.cycleLength = n;
    }
    if (periodLength != null) {
      const n = parseInt(periodLength, 10);
      if (!isNaN(n)) updateData.periodLength = Math.min(14, Math.max(1, n));
    }
    if (cycleLengthRange && typeof cycleLengthRange.min === 'number' && typeof cycleLengthRange.max === 'number') {
      updateData.cycleLengthRange = { min: cycleLengthRange.min, max: cycleLengthRange.max };
    }
    if (lastPeriodStart) {
      updateData.lastPeriodStart = new Date(lastPeriodStart);
      if (lastPeriodEnd) {
        updateData.lastPeriodEnd = new Date(lastPeriodEnd);
      } else {
        const start = new Date(lastPeriodStart);
        start.setDate(start.getDate() + (updateData.periodLength ?? 5));
        updateData.lastPeriodEnd = start;
      }
    }

    await User.findByIdAndUpdate(userId, updateData);

    const user = await User.findById(userId);
    if (user && !user.partnerCode) {
      await user.generatePartnerCode();
      await user.save();
    }

    const updatedUser = await User.findById(userId).select('-password');

    res.json({
      success: true,
      message: 'Onboarding completed successfully',
      data: {
        user: updatedUser
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
