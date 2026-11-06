// Theme manager for Study Buddy (Light / Dark mode)

export const THEME_KEY = "studyBuddyTheme";

export function getSavedTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "Dark" || saved === "dark") return "Dark";
    return "Light";
  } catch {
    return "Light";
  }
}

export function applyTheme(theme) {
  const normalized = (theme || "Light").toLowerCase();
  document.documentElement.setAttribute("data-theme", normalized);
  if (document.body) {
    document.body.setAttribute("data-theme", normalized);
  }
  try {
    localStorage.setItem(THEME_KEY, theme === "Dark" ? "Dark" : "Light");
  } catch (err) {
    console.warn("Could not save theme to localStorage:", err);
  }

  // Dispatch custom event for reactive listeners
  window.dispatchEvent(new CustomEvent("studyBuddyThemeChange", { detail: { theme } }));
}

export function initTheme() {
  const theme = getSavedTheme();
  applyTheme(theme);
  return theme;
}
