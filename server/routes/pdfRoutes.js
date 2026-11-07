const express = require("express");
const router = express.Router();
const multer = require("multer");
const { analyzePDF, generateAnswerSheet } = require("../controllers/pdfController");
const { protect } = require("../middleware/authMiddleware");

// Use memory storage for fast processing without disk clutter
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (req, file, cb) => {
    if (
      typeof file.originalname === "string" &&
      (file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf"))
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are supported!"), false);
    }
  },
});

router.post("/analyze", protect, upload.single("pdf"), analyzePDF);
router.post("/generate-answersheet", protect, upload.single("pdf"), generateAnswerSheet);

module.exports = router;
