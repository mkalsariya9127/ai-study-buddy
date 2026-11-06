const express = require("express");
const router = express.Router();
const { getDashboardStats, getUserActivities } = require("../controllers/dashboardController");
const { protect } = require("../middleware/authMiddleware");

// All dashboard endpoints require valid user JWT
router.get("/stats", protect, getDashboardStats);
router.get("/activities", protect, getUserActivities);

module.exports = router;
