const User = require("../models/User");

// XP rewards & leveling logic
const awardXP = async (userId, points, newBadge = null) => {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    const totalXP = (user.xpPoints || 0) + points;
    const newLevel = Math.max(1, Math.floor(Math.sqrt(totalXP / 50)) + 1);

    user.xpPoints = totalXP;
    user.level = newLevel;

    if (!Array.isArray(user.badges)) {
      user.badges = ["Novice Scholar 🎓"];
    }

    if (newBadge && !user.badges.includes(newBadge)) {
      user.badges.push(newBadge);
    }

    // Automatic Milestone Badges
    if (totalXP >= 200 && !user.badges.includes("Consistent Learner 🔥")) {
      user.badges.push("Consistent Learner 🔥");
    }
    if (totalXP >= 500 && !user.badges.includes("Master Scholar 🏆")) {
      user.badges.push("Master Scholar 🏆");
    }
    if (totalXP >= 1000 && !user.badges.includes("Grandmaster 👑")) {
      user.badges.push("Grandmaster 👑");
    }

    await user.save();
    return { xpPoints: user.xpPoints, level: user.level, badges: user.badges };
  } catch (err) {
    console.warn("Could not award XP:", err.message);
    return null;
  }
};

module.exports = { awardXP };
