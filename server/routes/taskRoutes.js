const express = require("express");
const router = express.Router();
const {
  getTasks,
  createTask,
  toggleTask,
  updateTask,
  deleteTask,
} = require("../controllers/taskController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.route("/").get(getTasks).post(createTask);
router.route("/:id").put(updateTask).delete(deleteTask);
router.route("/:id/toggle").patch(toggleTask).put(toggleTask);

module.exports = router;
