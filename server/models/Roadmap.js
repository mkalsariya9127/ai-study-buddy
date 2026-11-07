const mongoose = require("mongoose");

const milestoneSchema = new mongoose.Schema({
  day: { type: Number, required: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  tasks: [{ type: String }],
  completed: { type: Boolean, default: false },
});

const roadmapSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    goal: {
      type: String,
      required: [true, "Goal or Subject is required"],
      trim: true,
      maxlength: 120,
    },
    durationDays: {
      type: Number,
      required: true,
      min: 3,
      max: 90,
      default: 14,
    },
    milestones: [milestoneSchema],
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Roadmap", roadmapSchema);
