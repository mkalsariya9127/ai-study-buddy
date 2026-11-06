const express = require("express");
const router = express.Router();
const {
  getUserCourses,
  completeLesson,
  updateCourseProgress,
} = require("../controllers/courseController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.route("/").get(getUserCourses);
router.route("/:id/lesson-complete").post(completeLesson);
router.route("/:id/progress").put(updateCourseProgress);

module.exports = router;
