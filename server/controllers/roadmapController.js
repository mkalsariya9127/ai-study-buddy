const Roadmap = require("../models/Roadmap");
const { awardXP } = require("../utils/gamification");

const GEMINI_MODELS = ["gemini-3.5-flash", "gemini-flash-latest"];

// @desc    Get all study roadmaps for user
// @route   GET /api/roadmaps
const getRoadmaps = async (req, res, next) => {
  try {
    const roadmaps = await Roadmap.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: roadmaps.length, data: roadmaps });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new AI-generated personalized study roadmap
// @route   POST /api/roadmaps/generate-ai
const createAiRoadmap = async (req, res, next) => {
  try {
    const { goal, durationDays = 14 } = req.body || {};
    if (!goal || typeof goal !== "string" || !goal.trim()) {
      return res.status(400).json({ success: false, message: "Goal or target topic is required." });
    }

    const days = Math.min(90, Math.max(3, parseInt(durationDays, 10) || 14));
    const targetGoal = goal.trim();

    // Default milestones fallback
    let milestones = [];
    for (let d = 1; d <= days; d++) {
      milestones.push({
        day: d,
        title: `Day ${d}: Fundamental Phase ${Math.ceil(d / 3)}`,
        description: `Master core topics and complete sample problems for ${targetGoal}.`,
        tasks: [`Review theory for Day ${d}`, `Solve 3 practice exercises`, `Summarize key concepts`],
        completed: false,
      });
    }

    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    if (apiKey) {
      for (const model of GEMINI_MODELS) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 35000);
          const prompt = `You are an expert curriculum designer and academic study planner. Create a realistic, highly effective day-by-day learning roadmap for a student wanting to master this goal:\n\nGoal: "${targetGoal}"\nDuration: ${days} Days\n\nGenerate structured milestones for all ${days} days.\nRespond ONLY with a valid JSON array matching this schema:\n[\n  {\n    "day": 1,\n    "title": "Clear Day Theme",\n    "description": "Short explanation of daily learning focus",\n    "tasks": ["Task 1", "Task 2", "Task 3"]\n  }\n]`;

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: 1800, temperature: 0.3 },
              }),
              signal: controller.signal,
            }
          );
          clearTimeout(timeout);

          const data = await response.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const cleanJson = rawText.replace(/```json\n?|```/g, "").trim();
            const parsed = JSON.parse(cleanJson);
            if (Array.isArray(parsed) && parsed.length > 0) {
              milestones = parsed.map((m, idx) => ({
                day: m.day || idx + 1,
                title: m.title || `Day ${idx + 1}`,
                description: m.description || "",
                tasks: Array.isArray(m.tasks) ? m.tasks : ["Complete daily study focus"],
                completed: false,
              }));
              break;
            }
          }
        } catch (aiErr) {
          console.warn(`[Roadmap AI Notice for ${model}]:`, aiErr.message);
        }
      }
    }

    const roadmap = await Roadmap.create({
      user: req.user._id,
      goal: targetGoal,
      durationDays: days,
      milestones,
      progress: 0,
    });

    res.status(201).json({
      success: true,
      message: `Created ${days}-day study roadmap for ${targetGoal}!`,
      data: roadmap,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle roadmap milestone completion & award XP
// @route   PATCH /api/roadmaps/:id/milestones/:day/toggle
const toggleMilestone = async (req, res, next) => {
  try {
    const { id, day } = req.params;
    const roadmap = await Roadmap.findOne({ _id: id, user: req.user._id });
    if (!roadmap) {
      return res.status(404).json({ success: false, message: "Roadmap not found." });
    }

    const milestone = roadmap.milestones.find((m) => m.day === parseInt(day, 10));
    if (!milestone) {
      return res.status(404).json({ success: false, message: "Milestone day not found." });
    }

    milestone.completed = !milestone.completed;

    const completedCount = roadmap.milestones.filter((m) => m.completed).length;
    roadmap.progress = Math.round((completedCount / roadmap.milestones.length) * 100);
    await roadmap.save();

    if (milestone.completed) {
      await awardXP(req.user._id, 30, roadmap.progress === 100 ? "Roadmap Finisher 🚀" : null);
    }

    res.status(200).json({ success: true, data: roadmap });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a roadmap
// @route   DELETE /api/roadmaps/:id
const deleteRoadmap = async (req, res, next) => {
  try {
    const roadmap = await Roadmap.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!roadmap) {
      return res.status(404).json({ success: false, message: "Roadmap not found." });
    }
    res.status(200).json({ success: true, message: "Roadmap deleted successfully." });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRoadmaps,
  createAiRoadmap,
  toggleMilestone,
  deleteRoadmap,
};
