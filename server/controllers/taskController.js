const Task = require("../models/Task");
const { getKolkataDateString } = require("../utils/dateTime");
const { emitDashboardChanged } = require("../socket");
const { awardXP } = require("../utils/gamification");

// @desc    Get all tasks for user
// @route   GET /api/tasks
const getTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find({ user: req.user._id }).sort({ completed: 1, time: 1 });
    res.status(200).json({ success: true, count: tasks.length, data: tasks });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new task
// @route   POST /api/tasks
const createTask = async (req, res, next) => {
  try {
    const { title, subject, time, date } = req.body || {};
    if (typeof title !== "string" || !title.trim() || title.length > 200) {
      return res.status(400).json({ success: false, message: "Task title is required" });
    }
    if (
      (subject !== undefined && (typeof subject !== "string" || subject.length > 100)) ||
      (time !== undefined && (typeof time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) ||
      (date !== undefined && (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)))
    ) {
      return res.status(400).json({ success: false, message: "Invalid task details." });
    }

    const task = await Task.create({
      user: req.user._id,
      title: title.trim(),
      subject: subject ? subject.trim() : "Study",
      time: time || "10:00",
      date: date || getKolkataDateString(),
      completed: false,
    });

    if (task.completed) {
      await awardXP(req.user._id, 25);
    }
    emitDashboardChanged(req.user._id);
    res.status(201).json({ success: true, message: "Task created successfully", data: task });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle task completion status
// @route   PATCH /api/tasks/:id/toggle
const toggleTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    task.completed = !task.completed;
    await task.save();

    if (task.completed) {
      await awardXP(req.user._id, 25);
    }
    emitDashboardChanged(req.user._id);
    res.status(200).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task details or status
// @route   PUT /api/tasks/:id
const updateTask = async (req, res, next) => {
  try {
    const body = req.body || {};
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    if (body.completed !== undefined) {
      if (typeof body.completed !== "boolean") {
        return res.status(400).json({ success: false, message: "Task completion status must be boolean." });
      }
      task.completed = body.completed;
    }
    if (body.title !== undefined) {
      if (typeof body.title !== "string" || !body.title.trim() || body.title.length > 200) {
        return res.status(400).json({ success: false, message: "Invalid task title." });
      }
      task.title = body.title.trim();
    }
    if (body.subject !== undefined) {
      if (typeof body.subject !== "string" || body.subject.length > 100) {
        return res.status(400).json({ success: false, message: "Invalid task subject." });
      }
      task.subject = body.subject.trim();
    }
    if (body.time !== undefined) {
      if (typeof body.time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.time)) {
        return res.status(400).json({ success: false, message: "Invalid task time." });
      }
      task.time = body.time;
    }
    if (body.date !== undefined) {
      if (typeof body.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
        return res.status(400).json({ success: false, message: "Invalid task date." });
      }
      task.date = body.date;
    }

    const updatedTask = await task.save();
    if (task.completed) {
      await awardXP(req.user._id, 25);
    }
    emitDashboardChanged(req.user._id);
    res.status(200).json({ success: true, data: updatedTask });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    await task.deleteOne();
    emitDashboardChanged(req.user._id);
    res.status(200).json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTasks,
  createTask,
  toggleTask,
  updateTask,
  deleteTask,
};
