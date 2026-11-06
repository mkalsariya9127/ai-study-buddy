const mongoose = require("mongoose");

const courseCompletionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserCourse",
      required: true,
    },
    requestId: {
      type: String,
      required: true,
      maxlength: 100,
    },
  },
  { timestamps: true }
);

courseCompletionSchema.index(
  { user: 1, course: 1, requestId: 1 },
  { unique: true }
);

module.exports = mongoose.model("CourseCompletion", courseCompletionSchema);
