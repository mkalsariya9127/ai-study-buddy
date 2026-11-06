const StudySession = require("../models/StudySession");
const Task = require("../models/Task");
const { UserCourse } = require("../models/Course");
const QuizAttempt = require("../models/Quiz");
const Note = require("../models/Note");
const User = require("../models/User");
const { calculateStreak, getKolkataDateString } = require("../utils/dateTime");

// @desc    Get aggregated real-time dashboard statistics for authenticated user
// @route   GET /api/dashboard/stats
const getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // 1. Total Study Time (hours & minutes) from user's study sessions
    const studySessions = await StudySession.find({
      user: userId,
      mode: "study",
    }).select("durationMinutes durationSeconds date");

    const totalSeconds = studySessions.reduce(
      (sum, s) => sum + (s.durationSeconds || (s.durationMinutes || 0) * 60),
      0
    );
    const totalStudyMinutes = Math.round(totalSeconds / 60);
    const totalStudyHours = (totalStudyMinutes / 60).toFixed(1);

    // 2. Courses & Topics Progress
    const userCourses = await UserCourse.find({ user: userId });
    const completedLessonsCount = userCourses.reduce(
      (sum, c) => sum + (Number(c.completedLessons) || 0),
      0
    );

    let overallProgress = 0;
    if (userCourses.length > 0) {
      const sumProgress = userCourses.reduce((sum, c) => sum + (Number(c.progress) || 0), 0);
      overallProgress = Math.round(sumProgress / userCourses.length);
    }

    // 3. Completed Tasks
    const completedTasksCount = await Task.countDocuments({
      user: userId,
      completed: true,
    });

    const totalTopicsCompleted = completedLessonsCount + completedTasksCount;

    // 4. Completed Quizzes
    const quizzesCompleted = await QuizAttempt.countDocuments({
      user: userId,
    });

    // 5. Daily Streak (in Asia/Kolkata timezone)
    const distinctDates = await StudySession.find({
      user: userId,
      mode: "study",
    }).distinct("date");

    const streakDays = calculateStreak(distinctDates.filter(Boolean));

    // 6. Today's Checklist Tasks
    const todayStr = getKolkataDateString();
    const todayTasks = await Task.find({
      user: userId,
      date: todayStr,
    })
      .sort({ completed: 1, time: 1 })
      .limit(5);

    const totalTasksCount = await Task.countDocuments({ user: userId });
    const quizPerformance = await QuizAttempt.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          averagePercentage: { $avg: "$percentage" },
          completedCount: { $sum: 1 },
        },
      },
    ]);
    const latestQuiz = await QuizAttempt.findOne({ user: userId })
      .sort({ createdAt: -1 })
      .select("percentage createdAt");
    const averageQuizPercentage = quizPerformance.length
      ? Math.round(quizPerformance[0].averagePercentage)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        totalStudyHours: parseFloat(totalStudyHours) || 0,
        totalStudyMinutes,
        topicsCompleted: totalTopicsCompleted,
        completedLessonsCount,
        completedTasksCount,
        quizzesCompleted,
        averageQuizPercentage,
        latestQuizPercentage: latestQuiz?.percentage ?? 0,
        streakDays,
        overallProgress,
        tasksCount: totalTasksCount,
        todayTasks,
        todayDate: todayStr,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get chronological user activity feed across all actions
// @route   GET /api/dashboard/activities
const getUserActivities = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [recentSessions, recentTasks, recentQuizzes, recentNotes, user] = await Promise.all([
      StudySession.find({ user: userId }).sort({ createdAt: -1 }).limit(10),
      Task.find({ user: userId }).sort({ updatedAt: -1 }).limit(10),
      QuizAttempt.find({ user: userId }).sort({ createdAt: -1 }).limit(10),
      Note.find({ user: userId }).sort({ updatedAt: -1 }).limit(10),
      User.findById(userId).select("name email createdAt lastLoginAt course"),
    ]);

    const timeline = [];

    recentSessions.forEach((s) => {
      timeline.push({
        id: `session-${s._id}`,
        type: "study",
        title: `Study Session: ${s.durationMinutes} mins`,
        subtitle: `Mode: ${s.mode} · Logged ${s.date}`,
        date: s.completedAt || s.createdAt,
      });
    });

    recentTasks.forEach((t) => {
      timeline.push({
        id: `task-${t._id}`,
        type: "task",
        title: t.completed ? `Completed task: "${t.title}"` : `Created task: "${t.title}"`,
        subtitle: `Priority: ${t.priority || "Normal"} · Status: ${t.completed ? "Done" : "Pending"}`,
        date: t.updatedAt || t.createdAt,
      });
    });

    recentQuizzes.forEach((q) => {
      timeline.push({
        id: `quiz-${q._id}`,
        type: "quiz",
        title: `Quiz Attempt: Score ${q.score}/${q.totalQuestions} (${q.percentage}%)`,
        subtitle: q.percentage >= 70 ? "Passed! 🏆" : "Practiced quiz",
        date: q.createdAt,
      });
    });

    recentNotes.forEach((n) => {
      timeline.push({
        id: `note-${n._id}`,
        type: "note",
        title: `Note: "${n.title}"`,
        subtitle: `Category: ${n.category || "General"}`,
        date: n.updatedAt || n.createdAt,
      });
    });

    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({
      success: true,
      user: {
        id: user?._id,
        name: user?.name,
        email: user?.email,
        course: user?.course,
        registeredAt: user?.createdAt,
        lastLoginAt: user?.lastLoginAt || user?.updatedAt,
      },
      count: timeline.length,
      activities: timeline.slice(0, 30),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getUserActivities,
};
