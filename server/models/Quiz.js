const mongoose = require("mongoose");

const quizAttemptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      index: true,
    },
    attemptId: {
      type: String,
      required: true,
      maxlength: 100,
    },
    quizTitle: {
      type: String,
      default: "React Fundamentals Quiz",
    },
    score: {
      type: Number,
      required: true,
      min: 0,
    },
    totalQuestions: {
      type: Number,
      default: 5,
      min: 1,
    },
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    answers: {
      type: Map,
      of: Number,
    },
  },
  {
    timestamps: true,
  }
);

quizAttemptSchema.index({ user: 1, createdAt: -1 });
quizAttemptSchema.index(
  { user: 1, attemptId: 1 },
  { unique: true, partialFilterExpression: { attemptId: { $type: "string" } } }
);

module.exports = mongoose.model("QuizAttempt", quizAttemptSchema);
