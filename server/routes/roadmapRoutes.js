const express = require("express");
const router = express.Router();
const {
  getRoadmaps,
  createAiRoadmap,
  toggleMilestone,
  deleteRoadmap,
} = require("../controllers/roadmapController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.route("/")
  .get(getRoadmaps)
  .post(createAiRoadmap);

router.route("/:id")
  .delete(deleteRoadmap);

router.patch("/:id/milestones/:day/toggle", toggleMilestone);

module.exports = router;
