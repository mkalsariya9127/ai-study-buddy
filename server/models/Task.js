const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
    },
    subject: {
      type: String,
      default: "Study",
      trim: true,
    },
    time: {
      type: String,
      default: "10:00",
    },
    date: {
      type: String, // YYYY-MM-DD
      default: () => {
        const d = new Date();
        const kolkata = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        return kolkata.toISOString().split("T")[0];
      },
      index: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

taskSchema.index({ user: 1, date: 1 });
taskSchema.index({ user: 1, completed: 1 });

module.exports = mongoose.model("Task", taskSchema);
