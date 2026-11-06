const StudySession = require("../models/StudySession");
const { emitDashboardChanged } = require("../socket");
const {
  getKolkataDateString,
  getLastNDays,
  getDayName,
} = require("../utils/dateTime");

// @desc    Log a completed Pomodoro study session
// @route   POST /api/timer/session
const logSession = async (req, res, next) => {
  try {
    const { mode, durationSeconds, startTime, requestId } = req.body || {};
    if (
      !["study", "shortBreak", "longBreak"].includes(mode) ||
      !Number.isInteger(durationSeconds) ||
      durationSeconds < 1 ||
      durationSeconds > 2 * 60 * 60 ||
      typeof requestId !== "string" ||
      !/^[A-Za-z0-9._:-]{20,100}$/.test(requestId)
    ) {
      return res.status(400).json({ success: false, message: "Invalid study session." });
    }

    const parsedStart = startTime ? new Date(startTime) : null;
    const now = new Date();
    if (
      parsedStart &&
      (!Number.isFinite(parsedStart.getTime()) ||
        parsedStart.getTime() > now.getTime() + 60 * 1000 ||
        now.getTime() - parsedStart.getTime() > 3 * 60 * 60 * 1000)
    ) {
      return res.status(400).json({ success: false, message: "Invalid study session time range." });
    }

    const existing = await StudySession.findOne({ user: req.user._id, requestId });
    if (existing) {
      return res.status(200).json({ success: true, data: existing, duplicate: true });
    }

    const sessionDate = getKolkataDateString(now);
    let session;
    try {
      session = await StudySession.create({
        user: req.user._id,
        requestId,
        mode,
        durationSeconds,
        durationMinutes: Number((durationSeconds / 60).toFixed(1)),
        startTime: parsedStart || new Date(now.getTime() - durationSeconds * 1000),
        endTime: now,
        date: sessionDate,
        completedAt: now,
      });
    } catch (error) {
      if (error.code !== 11000) throw error;
      session = await StudySession.findOne({ user: req.user._id, requestId });
      if (!session) throw error;
      return res.status(200).json({ success: true, data: session, duplicate: true });
    }

    emitDashboardChanged(req.user._id);

    res.status(201).json({
      success: true,
      message: "Study session logged successfully",
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get study statistics for user
// @route   GET /api/timer/stats
const getStats = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const todayStr = getKolkataDateString();

    const totalSessions = await StudySession.countDocuments({ user: userId, mode: "study" });
    const todaySessions = await StudySession.countDocuments({
      user: userId,
      mode: "study",
      date: todayStr,
    });

    const sessions = await StudySession.find({ user: userId, mode: "study" }).select("durationMinutes durationSeconds");
    const totalSeconds = sessions.reduce((sum, s) => sum + (s.durationSeconds || (s.durationMinutes || 0) * 60), 0);
    const totalMinutes = Math.round(totalSeconds / 60);
    const totalHours = (totalMinutes / 60).toFixed(1);

    res.status(200).json({
      success: true,
      stats: {
        totalSessions,
        todaySessions,
        totalHours: parseFloat(totalHours) || 0,
        totalMinutes,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get daily study activity for chart (weekly / monthly)
// @route   GET /api/timer/activity
const getActivity = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const filter = req.query.filter === "monthly" ? "monthly" : "weekly";

    const daysCount = filter === "monthly" ? 30 : 7;
    const targetDates = getLastNDays(daysCount);

    // Fetch study sessions for these dates
    const sessions = await StudySession.find({
      user: userId,
      mode: "study",
      date: { $in: targetDates },
    }).select("date durationMinutes durationSeconds");

    // Aggregate by date
    const dateMap = {};
    sessions.forEach((s) => {
      const d = s.date;
      if (!dateMap[d]) dateMap[d] = 0;
      dateMap[d] += (s.durationSeconds || (s.durationMinutes || 0) * 60);
    });

    // Build day items
    const activity = targetDates.map((dateStr) => {
      const seconds = dateMap[dateStr] || 0;
      const minutes = Math.round(seconds / 60);
      const hours = parseFloat((minutes / 60).toFixed(2));
      return {
        date: dateStr,
        day: getDayName(dateStr),
        minutes,
        hours,
      };
    });

    // Calculate maximum hours for chart scale
    const maxDayHours = Math.max(0, ...activity.map((a) => a.hours));
    // Dynamic Y-axis scale (e.g. 2h, 4h, 6h, or at least 4h if low)
    const scaleMax = maxDayHours > 6 ? Math.ceil(maxDayHours * 1.2) : 6;

    // Generate normalized SVG coordinates for 600x190 viewbox
    // Chart area: width 600, height 190. Margin bottom 20, top 20 -> usable height 150
    const points = activity.map((item, index) => {
      const x = Math.round((index / (activity.length - 1 || 1)) * 600);
      const normalizedRatio = scaleMax > 0 ? item.hours / scaleMax : 0;
      // In SVG y=0 is top, y=190 is bottom
      const y = Math.round(165 - normalizedRatio * 140);
      return `${x},${y}`;
    }).join(" ");

    res.status(200).json({
      success: true,
      filter,
      scaleMax,
      maxDayHours,
      data: activity,
      svgPoints: points,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  logSession,
  getStats,
  getActivity,
};
