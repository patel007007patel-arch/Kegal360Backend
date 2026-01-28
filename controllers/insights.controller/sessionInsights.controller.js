import UserProgress from '../../models/UserProgress.model.js';

export const getSessionInsights = async (req, res) => {
  try {
    const userId = req.user._id;
    const { month, year, sessionType } = req.query;

    const query = { user: userId };
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      query.sessionStartedAt = { $gte: start, $lte: end };
    }

    const progressList = await UserProgress.find(query)
      .populate({
        path: 'session',
        match: sessionType ? { sessionType } : {},
        select: 'title sessionType duration'
      })
      .sort({ sessionStartedAt: -1 });

    // Filter out null sessions (if sessionType filter removed them)
    const validProgress = progressList.filter(p => p.session !== null);

    const totalSessions = validProgress.length;
    const totalMinutes = Math.round(validProgress.reduce((sum, p) => sum + (p.timeSpent || 0), 0) / 60);
    const completedSessions = validProgress.filter(p => p.sessionCompleted).length;

    // Calculate streak
    const sortedProgress = validProgress.sort((a, b) => {
      const dateA = a.sessionStartedAt || a.createdAt;
      const dateB = b.sessionStartedAt || b.createdAt;
      return dateB - dateA;
    });

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const progress of sortedProgress) {
      const sessionDate = new Date(progress.sessionStartedAt || progress.createdAt);
      sessionDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((currentDate - sessionDate) / (1000 * 60 * 60 * 24));

      if (diffDays === streak) {
        streak++;
        currentDate = sessionDate;
      } else {
        break;
      }
    }

    res.json({
      success: true,
      data: {
        totalSessions,
        totalMinutes,
        completedSessions,
        streak,
        sessions: validProgress.slice(0, 30).map(p => ({
          _id: p._id,
          session: p.session,
          sessionStartedAt: p.sessionStartedAt,
          sessionCompleted: p.sessionCompleted,
          timeSpent: p.timeSpent
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching session insights',
      error: error.message
    });
  }
};

