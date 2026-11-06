const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Note title is required"],
      trim: true,
    },
    subject: {
      type: String,
      default: "General",
      trim: true,
    },
    content: {
      type: String,
      required: [true, "Note content cannot be empty"],
    },
    date: {
      type: String,
      default: () => new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    },
  },
  {
    timestamps: true,
  }
);

noteSchema.index({ user: 1, title: "text", subject: "text", content: "text" });

module.exports = mongoose.model("Note", noteSchema);
