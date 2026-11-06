const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    language: {
      type: String,
      default: "English",
    },
    theme: {
      type: String,
      default: "Light",
    },
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    studyReminders: {
      type: Boolean,
      default: true,
    },
    courseUpdates: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Settings", settingsSchema);
