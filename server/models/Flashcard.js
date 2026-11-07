const mongoose = require("mongoose");

const flashcardSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    deckName: {
      type: String,
      required: [true, "Deck name is required"],
      trim: true,
      maxlength: 100,
      default: "General Study",
    },
    front: {
      type: String,
      required: [true, "Front (Question) is required"],
      trim: true,
      maxlength: 500,
    },
    back: {
      type: String,
      required: [true, "Back (Answer) is required"],
      trim: true,
      maxlength: 1000,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    lastReviewedAt: {
      type: Date,
      default: null,
    },
    nextReviewDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Flashcard", flashcardSchema);
