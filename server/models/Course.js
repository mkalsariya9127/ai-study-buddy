const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      default: "Development",
    },
    iconType: {
      type: String,
      default: "code",
    },
    color: {
      type: String,
      default: "blue",
    },
    description: {
      type: String,
      default: "",
    },
    totalLessons: {
      type: Number,
      default: 20,
    },
  },
  {
    timestamps: true,
  }
);

const userCourseSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    courseId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      default: "Development",
    },
    description: {
      type: String,
      default: "",
    },
    iconType: {
      type: String,
      default: "code",
    },
    color: {
      type: String,
      default: "blue",
    },
    totalLessons: {
      type: Number,
      default: 20,
      min: 1,
    },
    completedLessons: {
      type: Number,
      default: 0,
      min: 0,
    },
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

userCourseSchema.index({ user: 1, courseId: 1 }, { unique: true });
userCourseSchema.index({ user: 1, progress: 1 });

module.exports = {
  Course: mongoose.model("Course", courseSchema),
  UserCourse: mongoose.model("UserCourse", userCourseSchema),
};
