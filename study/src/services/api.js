const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const API_ORIGIN = new URL(
  API_BASE_URL,
  typeof window === "undefined" ? "http://localhost" : window.location.origin
).origin;
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const PRIVATE_CACHE_KEYS = [
  "studyBuddyTasks",
  "studyBuddyCourses",
  "studyBuddyNotes",
  "studyBuddyNotifications",
  "studyBuddyChatSessions",
  "studyBuddyActiveSessionId",
];

try {
  localStorage.removeItem("studyBuddyToken");
} catch {
  // Storage can be unavailable in privacy-restricted browser contexts.
}

function readCookie(name) {
  if (typeof document === "undefined") return "";
  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : "";
}

async function getCsrfToken() {
  const existing = readCookie("studyBuddyCsrf");
  if (existing) return existing;

  const response = await fetch(`${API_BASE_URL}/auth/csrf`, {
    credentials: "include",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.csrfToken) {
    throw new Error(data.message || "Could not initialize a secure request.");
  }
  return data.csrfToken;
}

async function request(endpoint, options = {}) {
  try {
    const method = (options.method || "GET").toUpperCase();
    const headers = { ...(options.headers || {}) };
    const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
    if (options.body !== undefined && !isFormData && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    if (UNSAFE_METHODS.has(method)) {
      headers["X-CSRF-Token"] = await getCsrfToken();
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      method,
      headers,
      credentials: "include",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const apiUnavailable = response.status === 502 || response.status === 504;
      if (response.status === 401 && typeof window !== "undefined") {
        window.dispatchEvent(new Event("studyBuddy:unauthorized"));
      }
      return {
        success: false,
        networkError: apiUnavailable,
        error: apiUnavailable
          ? "Cannot reach the API server. Start the backend and check VITE_API_BASE_URL if it is hosted separately."
          : data.message || `Request failed with status ${response.status}`,
        status: response.status,
        retryAfterSeconds: data.retryAfterSeconds,
      };
    }
    return { success: true, ...data };
  } catch {
    console.warn(`[API Network Notice]: Endpoint ${endpoint} is unreachable.`);
    return {
      success: false,
      networkError: true,
      error:
        "Cannot reach the API server. Start the backend and check VITE_API_BASE_URL if it is hosted separately.",
    };
  }
}

function saveProfile(user) {
  if (!user) return;
  try {
    const previous = JSON.parse(localStorage.getItem("studyBuddyProfile") || "null");
    if (!previous || previous.id !== user.id) {
      PRIVATE_CACHE_KEYS.forEach((key) => localStorage.removeItem(key));
    }
    localStorage.setItem("studyBuddyProfile", JSON.stringify(user));
  } catch {
    // The profile is cached for display only; the server remains authoritative.
  }
}

export const authAPI = {
  register: async (userData) =>
    await request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    }),

  verifyOTP: async (verifyData) => {
    const res = await request("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify(verifyData),
    });
    if (res.success) saveProfile(res.user);
    return res;
  },

  resendOTP: async (email) =>
    await request("/auth/resend-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  googleLogin: async (credential) => {
    const res = await request("/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential }),
    });
    if (res.success) saveProfile(res.user);
    return res;
  },

  login: async (credentials) => {
    const res = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    if (res.success) saveProfile(res.user);
    return res;
  },

  resetPassword: async (resetData) =>
    await request("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(resetData),
    }),

  forgotPassword: async (email) =>
    await request("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  getProfile: async () => {
    const res = await request("/user/profile", { method: "GET" });
    if (res.success) saveProfile(res.user);
    return res;
  },

  updateProfile: async (profileData) => {
    const res = await request("/user/profile", {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
    if (res.success) saveProfile(res.user);
    return res;
  },

  logout: async () => {
    const res = await request("/auth/logout", { method: "POST" });
    if (res.success || res.status === 401) {
      try {
        localStorage.removeItem("studyBuddyToken");
        localStorage.removeItem("studyBuddyProfile");
        PRIVATE_CACHE_KEYS.forEach((key) => localStorage.removeItem(key));
      } catch {
        // Session revocation is handled by the server.
      }
    }
    return res;
  },
};

export const dashboardAPI = {
  getStats: async () => await request("/dashboard/stats", { method: "GET" }),
  getActivities: async () => await request("/dashboard/activities", { method: "GET" }),
  getActivity: async (filter = "weekly") =>
    await request(`/timer/activity?filter=${filter}`, { method: "GET" }),
};

export const notesAPI = {
  getAll: async (search = "") =>
    await request(`/notes${search ? `?search=${encodeURIComponent(search)}` : ""}`, {
      method: "GET",
    }),
  create: async (note) =>
    await request("/notes", { method: "POST", body: JSON.stringify(note) }),
  update: async (id, note) =>
    await request(`/notes/${id}`, { method: "PUT", body: JSON.stringify(note) }),
  delete: async (id) => await request(`/notes/${id}`, { method: "DELETE" }),
};

export const tasksAPI = {
  getAll: async () => await request("/tasks", { method: "GET" }),
  create: async (task) =>
    await request("/tasks", { method: "POST", body: JSON.stringify(task) }),
  toggleComplete: async (id) =>
    await request(`/tasks/${id}/toggle`, { method: "PATCH" }),
  update: async (id, task) =>
    await request(`/tasks/${id}`, { method: "PUT", body: JSON.stringify(task) }),
  delete: async (id) => await request(`/tasks/${id}`, { method: "DELETE" }),
};

export const coursesAPI = {
  getAll: async () => await request("/courses", { method: "GET" }),
  completeLesson: async (id, requestId) =>
    await request(`/courses/${id}/lesson-complete`, {
      method: "POST",
      body: JSON.stringify({ requestId }),
    }),
  updateProgress: async (id, progress) =>
    await request(`/courses/${id}/progress`, {
      method: "PUT",
      body: JSON.stringify({ progress }),
    }),
};

export const timerAPI = {
  logSession: async (sessionData) =>
    await request("/timer/session", {
      method: "POST",
      body: JSON.stringify(sessionData),
    }),
  getStats: async () => await request("/timer/stats", { method: "GET" }),
  getActivity: async (filter = "weekly") =>
    await request(`/timer/activity?filter=${filter}`, { method: "GET" }),
};

export const quizAPI = {
  getQuestions: async () => await request("/quiz/questions", { method: "GET" }),
  submit: async (quizData) =>
    await request("/quiz/submit", {
      method: "POST",
      body: JSON.stringify(quizData),
    }),
  getHistory: async () => await request("/quiz/history", { method: "GET" }),
};

export const aiAPI = {
  solveImage: async (imageBase64, mimeType, prompt) =>
    await request("/ai/solve-image", {
      method: "POST",
      body: JSON.stringify({ imageBase64, mimeType, prompt }),
    }),
  chat: async (message, history = []) =>
    await request("/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message, history }),
    }),
};

export const pdfAPI = {
  analyze: async (file) => {
    const formData = new FormData();
    formData.append("pdf", file);
    return await request("/pdf/analyze", { method: "POST", body: formData });
  },
  generateAnswerSheet: async (file) => {
    const formData = new FormData();
    formData.append("pdf", file);
    return await request("/pdf/generate-answersheet", { method: "POST", body: formData });
  },
};

export const settingsAPI = {
  getSettings: async () => await request("/settings", { method: "GET" }),
  updateSettings: async (settings) =>
    await request("/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),
};

export const flashcardsAPI = {
  getAll: async (deck = "") => await request(`/flashcards${deck ? `?deck=${encodeURIComponent(deck)}` : ""}`, { method: "GET" }),
  create: async (card) => await request("/flashcards", { method: "POST", body: JSON.stringify(card) }),
  review: async (id, difficulty) => await request(`/flashcards/${id}/review`, { method: "PUT", body: JSON.stringify({ difficulty }) }),
  delete: async (id) => await request(`/flashcards/${id}`, { method: "DELETE" }),
  generateAI: async (topic, text) => await request("/flashcards/generate-ai", { method: "POST", body: JSON.stringify({ topic, text }) }),
};

export { API_BASE_URL, API_ORIGIN };
