const mongoose = require("mongoose");

const studySessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      index: true,
    },
    requestId: {
      type: String,
      required: true,
      maxlength: 100,
    },
    mode: {
      type: String,
      enum: ["study", "shortBreak", "longBreak"],
      default: "study",
    },
    durationSeconds: {
      type: Number,
      default: 1500, // 25 minutes default
      min: [1, "Duration must be at least 1 second"],
    },
    durationMinutes: {
      type: Number,
      default: 25,
      min: 0,
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
      default: Date.now,
    },
    date: {
      type: String, // YYYY-MM-DD in Asia/Kolkata timezone
      index: true,
    },
    completedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for user-scoped queries and fast activity lookups
studySessionSchema.index({ user: 1, date: 1 });
studySessionSchema.index({ user: 1, mode: 1, completedAt: -1 });
studySessionSchema.index(
  { user: 1, requestId: 1 },
  { unique: true, partialFilterExpression: { requestId: { $type: "string" } } }
);

module.exports = mongoose.model("StudySession", studySessionSchema);
