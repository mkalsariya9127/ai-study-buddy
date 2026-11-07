const express = require("express");
const router = express.Router();
const {
  getFlashcards,
  createFlashcard,
  reviewFlashcard,
  deleteFlashcard,
  generateAiFlashcards,
} = require("../controllers/flashcardController");
const { protect } = require("../middleware/authMiddleware");

// All flashcard routes require verified authentication
router.use(protect);

router.route("/")
  .get(getFlashcards)
  .post(createFlashcard);

router.post("/generate-ai", generateAiFlashcards);

router.route("/:id")
  .delete(deleteFlashcard);

router.put("/:id/review", reviewFlashcard);

module.exports = router;
