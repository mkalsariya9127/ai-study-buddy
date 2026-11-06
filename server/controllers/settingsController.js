const Settings = require("../models/Settings");

// @desc    Get user settings
// @route   GET /api/settings
const getSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne({ user: req.user._id });

    if (!settings) {
      settings = await Settings.create({ user: req.user._id });
    }

    res.status(200).json({ success: true, settings });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user settings
// @route   PUT /api/settings
const updateSettings = async (req, res, next) => {
  try {
    const body = req.body || {};
    for (const field of ["language", "theme"]) {
      if (body[field] !== undefined && (typeof body[field] !== "string" || body[field].length > 40)) {
        return res.status(400).json({ success: false, message: `Invalid ${field} value.` });
      }
    }
    for (const field of ["emailNotifications", "studyReminders", "courseUpdates"]) {
      if (body[field] !== undefined && typeof body[field] !== "boolean") {
        return res.status(400).json({ success: false, message: `Invalid ${field} value.` });
      }
    }

    let settings = await Settings.findOne({ user: req.user._id });

    if (!settings) {
      settings = new Settings({ user: req.user._id });
    }

    if (body.language !== undefined) settings.language = body.language;
    if (body.theme !== undefined) settings.theme = body.theme;
    if (body.emailNotifications !== undefined) settings.emailNotifications = body.emailNotifications;
    if (body.studyReminders !== undefined) settings.studyReminders = body.studyReminders;
    if (body.courseUpdates !== undefined) settings.courseUpdates = body.courseUpdates;

    await settings.save();
    res.status(200).json({ success: true, message: "Settings saved successfully", settings });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
