const QuizAttempt = require("../models/Quiz");
const { emitDashboardChanged } = require("../socket");

const reactQuestions = [
  {
    id: 1,
    question: "What is React?",
    options: [
      "A programming language",
      "A JavaScript library",
      "A database",
      "An operating system",
    ],
    answer: 1,
  },
  {
    id: 2,
    question: "Which hook is used to manage state in React?",
    options: ["useEffect", "useState", "useRef", "useMemo"],
    answer: 1,
  },
  {
    id: 3,
    question: "Which company developed JavaScript?",
    options: ["Microsoft", "Google", "Netscape", "Apple"],
    answer: 2,
  },
  {
    id: 4,
    question: "Which HTML tag is used to create a link?",
    options: ["<link>", "<a>", "<href>", "<url>"],
    answer: 1,
  },
  {
    id: 5,
    question: "Which method is used to display data in the console?",
    options: ["console.log()", "print()", "display()", "write()"],
    answer: 0,
  },
];

// @desc    Get quiz questions
// @route   GET /api/quiz/questions
const getQuestions = (req, res) => {
  // Return without revealing answer keys directly for extra integrity
  const questionsForUser = reactQuestions.map(({ id, question, options }) => ({
    id,
    question,
    options,
  }));
  res.status(200).json({ success: true, count: questionsForUser.length, data: questionsForUser });
};

// @desc    Submit quiz attempt & score
// @route   POST /api/quiz/submit
const submitQuiz = async (req, res, next) => {
  try {
    const { answers, quizTitle, attemptId } = req.body || {};
    if (
      !answers ||
      typeof answers !== "object" ||
      Array.isArray(answers) ||
      typeof attemptId !== "string" ||
      !/^[A-Za-z0-9._:-]{20,100}$/.test(attemptId) ||
      (quizTitle !== undefined && (typeof quizTitle !== "string" || quizTitle.length > 100))
    ) {
      return res.status(400).json({ success: false, message: "Invalid quiz submission." });
    }

    const safeAnswers = {};
    for (const [questionIndex, answerIndex] of Object.entries(answers)) {
      if (!/^[0-4]$/.test(questionIndex) || !Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) {
        return res.status(400).json({ success: false, message: "Invalid quiz answers." });
      }
      safeAnswers[questionIndex] = answerIndex;
    }

    const existing = await QuizAttempt.findOne({ user: req.user._id, attemptId });
    if (existing) {
      return res.status(200).json({
        success: true,
        score: existing.score,
        totalQuestions: existing.totalQuestions,
        percentage: existing.percentage,
        attemptId: existing._id,
        duplicate: true,
      });
    }

    let score = 0;
    reactQuestions.forEach((q, index) => {
      if (safeAnswers[index] === q.answer) {
        score++;
      }
    });

    const percentage = Math.round((score / reactQuestions.length) * 100);

    const attempt = await QuizAttempt.create({
      user: req.user._id,
      attemptId,
      quizTitle: quizTitle || "React Fundamentals Quiz",
      score,
      totalQuestions: reactQuestions.length,
      percentage,
      answers: safeAnswers,
    });

    emitDashboardChanged(req.user._id);
    res.status(200).json({
      success: true,
      score,
      totalQuestions: reactQuestions.length,
      percentage,
      attemptId: attempt._id,
    });
  } catch (error) {
    if (error.code === 11000) {
      const attempt = await QuizAttempt.findOne({
        user: req.user._id,
        attemptId: req.body?.attemptId,
      });
      if (attempt) {
        return res.status(200).json({
          success: true,
          score: attempt.score,
          totalQuestions: attempt.totalQuestions,
          percentage: attempt.percentage,
          attemptId: attempt._id,
          duplicate: true,
        });
      }
    }
    next(error);
  }
};

// @desc    Get user's quiz attempt history
// @route   GET /api/quiz/history
const getQuizHistory = async (req, res, next) => {
  try {
    const history = await QuizAttempt.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: history.length, data: history });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getQuestions,
  submitQuiz,
  getQuizHistory,
};
