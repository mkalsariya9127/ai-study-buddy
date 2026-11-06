const express = require("express");
const router = express.Router();
const { getQuestions, submitQuiz, getQuizHistory } = require("../controllers/quizController");
const { protect } = require("../middleware/authMiddleware");

router.get("/questions", getQuestions);
router.post("/submit", protect, submitQuiz);
router.get("/history", protect, getQuizHistory);

module.exports = router;
