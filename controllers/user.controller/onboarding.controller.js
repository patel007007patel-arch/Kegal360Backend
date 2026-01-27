import User from '../../models/User.model.js';
import UserAnswer from '../../models/UserAnswer.model.js';
import Question from '../../models/Question.model.js';

export const completeOnboarding = async (req, res) => {
  try {
    const userId = req.user._id;
    const { answers, trackCycle, cycleType, cycleLength, periodLength, cycleLengthRange, lastPeriodStart, lastPeriodEnd, appFor, name } = req.body;

    // Update user onboarding data
    const updateData = {
      onboardingCompleted: true,
      appFor: appFor || 'myself'
    };

    // "What should we call you?" → saved as user.name and shown on Home ("Welcome, {name}")
    if (name != null && String(name).trim()) {
      updateData.name = String(name).trim();
    } else if (answers && Array.isArray(answers) && answers.length > 0) {
      const nameQuestion = await Question.findOne({
        category: 'onboarding',
        question: /what should we call you/i
      });
      if (nameQuestion) {
        const nameAnswer = answers.find(a => a.questionId && String(a.questionId) === String(nameQuestion._id));
        if (nameAnswer?.answer != null && String(nameAnswer.answer).trim()) {
          updateData.name = String(nameAnswer.answer).trim();
        }
      }
    }

    if (trackCycle !== undefined) updateData.trackCycle = trackCycle;
    if (cycleType) updateData.cycleType = cycleType;
    if (cycleLength) updateData.cycleLength = cycleLength;
    if (periodLength !== undefined) updateData.periodLength = Math.min(14, Math.max(1, parseInt(periodLength, 10) || 5));
    if (cycleLengthRange) {
      updateData.cycleLengthRange = {
        min: cycleLengthRange.min,
        max: cycleLengthRange.max
      };
    }
    if (lastPeriodStart) {
      updateData.lastPeriodStart = new Date(lastPeriodStart);
      // If only start date provided, estimate end date (default 5 days)
      if (!lastPeriodEnd) {
        const start = new Date(lastPeriodStart);
        start.setDate(start.getDate() + 5);
        updateData.lastPeriodEnd = start;
      } else {
        updateData.lastPeriodEnd = new Date(lastPeriodEnd);
      }
    }

    await User.findByIdAndUpdate(userId, updateData);

    // Save answers to questions
    if (answers && Array.isArray(answers)) {
      for (const answer of answers) {
        await UserAnswer.findOneAndUpdate(
          { user: userId, question: answer.questionId },
          { answer: answer.answer },
          { upsert: true, new: true }
        );
      }
    }

    // Partner code is already generated during registration
    // Just ensure it exists (should already be there)
    const user = await User.findById(userId);
    if (!user.partnerCode) {
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

export const getOnboardingQuestions = async (req, res) => {
  try {
    const questions = await Question.find({ category: 'onboarding' }).sort({ order: 1 });

    res.json({
      success: true,
      data: {
        questions
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching questions',
      error: error.message
    });
  }
};

export default { completeOnboarding, getOnboardingQuestions };
