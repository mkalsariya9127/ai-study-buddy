const express = require("express");
const router = express.Router();
const { chatWithAI, solveImageDoubt } = require("../controllers/aiController");
const { protect } = require("../middleware/authMiddleware");

router.post("/chat", protect, chatWithAI);
router.post("/solve-image", protect, solveImageDoubt);

module.exports = router;
