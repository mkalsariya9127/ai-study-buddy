// Timezone-aware date utilities for Asia/Kolkata (IST: UTC+5:30)

const TIMEZONE = "Asia/Kolkata";

/**
 * Returns current date formatted as YYYY-MM-DD in Asia/Kolkata
 */
function getKolkataDateString(dateObj = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(dateObj); // Returns YYYY-MM-DD
}

/**
 * Add or subtract days from a YYYY-MM-DD string
 */
function addDaysToDateString(dateStr, days) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split("T")[0];
}

/**
 * Returns array of the last N days (including today) formatted as YYYY-MM-DD
 */
function getLastNDays(n = 7) {
  const todayStr = getKolkataDateString();
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    days.push(addDaysToDateString(todayStr, -i));
  }
  return days;
}

/**
 * Returns day-of-week abbreviation (Mon, Tue, Wed...) for a YYYY-MM-DD string
 */
function getDayName(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(date);
}

/**
 * Calculates current consecutive study streak in Asia/Kolkata
 * @param {Array<string>} activeDateStrings - Array of unique 'YYYY-MM-DD' dates with valid study activity
 * @returns {number} streak in days
 */
function calculateStreak(activeDateStrings) {
  if (!Array.isArray(activeDateStrings) || activeDateStrings.length === 0) {
    return 0;
  }

  const dateSet = new Set(activeDateStrings);
  const today = getKolkataDateString();
  const yesterday = addDaysToDateString(today, -1);

  // If user has not studied today and not yesterday, streak is broken -> 0
  let currentCheckDate = null;
  if (dateSet.has(today)) {
    currentCheckDate = today;
  } else if (dateSet.has(yesterday)) {
    currentCheckDate = yesterday;
  } else {
    return 0;
  }

  let streak = 0;
  while (dateSet.has(currentCheckDate)) {
    streak++;
    currentCheckDate = addDaysToDateString(currentCheckDate, -1);
  }

  return streak;
}

module.exports = {
  TIMEZONE,
  getKolkataDateString,
  addDaysToDateString,
  getLastNDays,
  getDayName,
  calculateStreak,
};
