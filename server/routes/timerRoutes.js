const express = require("express");
const router = express.Router();
const { logSession, getStats, getActivity } = require("../controllers/timerController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.post("/session", logSession);
router.get("/stats", getStats);
router.get("/activity", getActivity);

module.exports = router;
