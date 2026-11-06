import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Bot,
  BookOpen,
  CalendarDays,
  NotebookPen,
  Brain,
  UserRound,
  LogOut,
  Clock3,
  Target,
  ClipboardCheck,
  Flame,
  Bell,
  Settings,
  ChevronRight,
  Check,
  CheckCheck,
  Sparkles,
  FileText,
  TrendingUp,
  Code2,
  Database,
  Palette,
  Trash2,
  X,
  RefreshCw,
} from "lucide-react";

import "./Dashboard.css";
import {
  dashboardAPI,
  authAPI,
  tasksAPI,
  coursesAPI,
  timerAPI,
} from "../services/api";
import { useDashboardSocket } from "../context/useDashboardSocket";

const courseIcons = {
  code: Code2,
  brain: Brain,
  database: Database,
  palette: Palette,
};

const courseColors = ["blue", "purple", "green", "orange"];

const DEFAULT_NOTIFICATIONS = [
  {
    id: "notif-1",
    title: "Welcome to Study Buddy! 🚀",
    message: "Your AI study assistant is ready. Organize notes and set your daily goals.",
    time: "Just now",
    read: false,
    type: "welcome",
  },
  {
    id: "notif-2",
    title: "Study Planner Reminder ⏰",
    message: "Create tasks in your Study Planner to maintain a high daily score!",
    time: "1h ago",
    read: false,
    type: "planner",
  },
  {
    id: "notif-3",
    title: "Quiz Challenge Ready 🧠",
    message: "Test your skills with custom quizzes in React, Python, or SQL.",
    time: "3h ago",
    read: false,
    type: "quiz",
  },
];

function getSavedNotifications() {
  try {
    const saved = localStorage.getItem("studyBuddyNotifications");
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (error) {
    console.error("Error loading notifications:", error);
  }
  return DEFAULT_NOTIFICATIONS;
}

function Dashboard() {
  // 1. User Profile State
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem("studyBuddyProfile");
      return saved ? JSON.parse(saved) : { name: "Student", email: "" };
    } catch {
      return { name: "Student", email: "" };
    }
  });

  const studentName = profile.name?.trim() || "Student";
  const studentInitial = studentName.charAt(0).toUpperCase();
  const studentPhoto = profile.photo || "";

  // 2. Real-Data Dashboard Metrics State (Zero baseline for new users)
  const [stats, setStats] = useState({
    totalStudyHours: 0,
    totalStudyMinutes: 0,
    topicsCompleted: 0,
    completedLessonsCount: 0,
    completedTasksCount: 0,
    quizzesCompleted: 0,
    averageQuizPercentage: 0,
    latestQuizPercentage: 0,
    streakDays: 0,
    overallProgress: 0,
    tasksCount: 0,
  });

  // 3. User Tasks & Courses from MongoDB
  const [tasks, setTasks] = useState([]);
  const [courses, setCourses] = useState([]);


  // 4. Study Activity Graph State
  const [activityFilter, setActivityFilter] = useState("weekly");
  const [activityData, setActivityData] = useState([]);
  const [activityPoints, setActivityPoints] = useState("0,165 100,165 200,165 300,165 400,165 500,165 600,165");
  const [activityScaleMax, setActivityScaleMax] = useState(6);

  // 5. Notifications State
  const [notifications, setNotifications] = useState(getSavedNotifications);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef(null);
  const isMountedRef = useRef(true);
  const navigate = useNavigate();

  const unreadCount = notifications.filter((item) => !item.read).length;

  const fetchAllDashboardData = useCallback(async () => {
    try {
      const [statsRes, activityRes, coursesRes, profileRes, activitiesRes] = await Promise.all([
        dashboardAPI.getStats(),
        timerAPI.getActivity(activityFilter),
        coursesAPI.getAll(),
        authAPI.getProfile(),
        dashboardAPI.getActivities(),
      ]);

      if (!isMountedRef.current) return;
      if (statsRes?.success && statsRes.data) {
        setStats(statsRes.data);
        setTasks(Array.isArray(statsRes.data.todayTasks) ? statsRes.data.todayTasks : []);
      }
      if (activityRes?.success && Array.isArray(activityRes.data)) {
        setActivityData(activityRes.data);
        setActivityPoints(activityRes.svgPoints || "0,165 100,165 200,165 300,165 400,165 500,165 600,165");
        setActivityScaleMax(activityRes.scaleMax || 6);
      }
      if (coursesRes?.success && Array.isArray(coursesRes.data)) setCourses(coursesRes.data);
      if (profileRes?.success && profileRes.user) setProfile(profileRes.user);

      if (activitiesRes?.success && Array.isArray(activitiesRes.activities) && activitiesRes.activities.length > 0) {
        const dynamicNotifs = activitiesRes.activities.slice(0, 5).map((act) => ({
          id: act.id,
          title: act.title,
          message: act.subtitle,
          time: new Date(act.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          read: false,
          type: act.type,
        }));
        setNotifications((prev) => {
          const readIds = new Set(prev.filter((p) => p.read).map((p) => p.id));
          return dynamicNotifs.map((n) => ({ ...n, read: readIds.has(n.id) }));
        });
      }
    } catch (err) {
      console.warn("[Dashboard Sync Notice]:", err);
    }
  }, [activityFilter]);

  useDashboardSocket(fetchAllDashboardData);

  useEffect(() => {
    isMountedRef.current = true;
    queueMicrotask(() => {
      if (isMountedRef.current) fetchAllDashboardData();
    });
    window.addEventListener("focus", fetchAllDashboardData);
    window.addEventListener("storage", fetchAllDashboardData);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener("focus", fetchAllDashboardData);
      window.removeEventListener("storage", fetchAllDashboardData);
    };
  }, [fetchAllDashboardData]);

  // Toggle Task Completion in MongoDB
  const handleToggleTask = async (taskId) => {
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) =>
        (t._id === taskId || t.id === taskId) ? { ...t, completed: !t.completed } : t
      )
    );

    try {
      const updateRes = await tasksAPI.toggleComplete(taskId);
      if (!updateRes.success) {
        const latestStats = await dashboardAPI.getStats();
        if (latestStats.success && latestStats.data) {
          setStats(latestStats.data);
          setTasks(latestStats.data.todayTasks || []);
        }
        window.alert(updateRes.error || "Unable to update this task.");
        return;
      }
      const res = await dashboardAPI.getStats();
      if (res && res.success && res.data) {
        setStats(res.data);
        setTasks(res.data.todayTasks || []);
      }
    } catch (err) {
      console.warn("Failed to toggle task:", err);
      const refreshRes = await dashboardAPI.getStats();
      if (refreshRes?.success && refreshRes.data) {
        setStats(refreshRes.data);
        setTasks(refreshRes.data.todayTasks || []);
      } else {
        window.alert("Task update could not be confirmed. Refresh the dashboard.");
      }
    }
  };

  const handleLogout = async () => {
    const result = await authAPI.logout();
    if (result.success) {
      navigate("/login", { replace: true });
      return;
    }
    window.alert(result.error || "Unable to end the server session. Please try again.");
  };

  // Toggle Study Activity Filter (Weekly vs Monthly)
  const toggleActivityFilter = () => {
    setActivityFilter((prev) => (prev === "weekly" ? "monthly" : "weekly"));
  };

  // Notification actions
  const markAllAsRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((item) => ({ ...item, read: true }));
      try {
        localStorage.setItem("studyBuddyNotifications", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const markAsRead = (id) => {
    setNotifications((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, read: true } : item));
      try {
        localStorage.setItem("studyBuddyNotifications", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const removeNotification = (id, event) => {
    if (event) event.stopPropagation();
    setNotifications((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem("studyBuddyNotifications", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    try {
      localStorage.setItem("studyBuddyNotifications", JSON.stringify([]));
    } catch (e) {
      console.error(e);
    }
  };

  // Outside click handler for notifications
  useEffect(() => {
    if (!showNotifications) return;

    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showNotifications]);

  return (
    <div className="dashboard-page">
      {/* SIDEBAR */}
      <aside className="dashboard-sidebar">
        <Link to="/" className="dashboard-logo">
          <span className="logo-mark">U</span>
          <span>AI Study Buddy</span>
        </Link>

        <div className="student-profile">
          <div className="profile-avatar">
            {studentPhoto ? (
              <img src={studentPhoto} alt={`${studentName} profile`} />
            ) : (
              studentInitial
            )}
          </div>
          <h3>{studentName}</h3>
          <p>{profile.course || "Keep learning, keep growing!"}</p>
          <span className="student-level">Level 1 · Learner</span>
        </div>

        <nav className="sidebar-menu">
          <p className="menu-heading">MENU</p>

          <Link to="/dashboard" className="sidebar-link active">
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </Link>

          <Link to="/ai-assistant" className="sidebar-link">
            <Bot size={18} />
            <span>AI Assistant</span>
          </Link>

          <Link to="/courses" className="sidebar-link">
            <BookOpen size={18} />
            <span>Study Materials</span>
          </Link>

          <Link to="/study-planner" className="sidebar-link">
            <CalendarDays size={18} />
            <span>Study Planner</span>
          </Link>

          <Link to="/notes" className="sidebar-link">
            <NotebookPen size={18} />
            <span>My Notes</span>
          </Link>

          <Link to="/quiz" className="sidebar-link">
            <Brain size={18} />
            <span>Quiz Generator</span>
          </Link>

          <p className="menu-heading account-heading">ACCOUNT</p>

          <Link to="/profile" className="sidebar-link">
            <UserRound size={18} />
            <span>My Profile</span>
          </Link>

          <Link to="/settings" className="sidebar-link">
            <Settings size={18} />
            <span>Settings</span>
          </Link>

          <button type="button" onClick={handleLogout} className="sidebar-link logout-link">
            <LogOut size={18} />
            <span>Log Out</span>
          </button>
        </nav>

        <div className="sidebar-tip">
          <div className="tip-icon"><Sparkles size={19} /></div>
          <h4>Daily Motivation</h4>
          <p>Small progress every day adds up to big results.</p>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-welcome">
            <p className="welcome-label">YOUR LEARNING SPACE</p>
            <h1>Good Morning, <span>{studentName}!</span></h1>
            <p className="header-subtitle">
              Ready to learn something new today?
            </p>
          </div>

          <div className="header-actions" ref={notificationsRef}>
            <button
              type="button"
              className={`header-bell-btn ${showNotifications ? "active" : ""}`}
              aria-label="Notifications"
              aria-expanded={showNotifications}
              onClick={() => setShowNotifications((prev) => !prev)}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="notification-dot" title={`${unreadCount} unread`} />
              )}
            </button>

            <Link to="/settings" aria-label="Settings">
              <Settings size={18} />
            </Link>

            <Link to="/profile" className="header-avatar">
              {studentPhoto ? (
                <img src={studentPhoto} alt={`${studentName} profile`} />
              ) : (
                studentInitial
              )}
            </Link>

            {/* Notification Dropdown Panel */}
            {showNotifications && (
              <div className="notification-dropdown" role="region" aria-label="Notifications list">
                <div className="notification-dropdown-header">
                  <div className="notification-title-wrap">
                    <h3>Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="notification-unread-pill">{unreadCount} New</span>
                    )}
                  </div>
                  <div className="notification-header-actions">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        className="notif-action-btn"
                        onClick={markAllAsRead}
                        title="Mark all as read"
                      >
                        <CheckCheck size={14} />
                        <span>Mark all read</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="notif-close-btn"
                      onClick={() => setShowNotifications(false)}
                      aria-label="Close notifications"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>

                <div className="notification-list">
                  {notifications.length === 0 ? (
                    <div className="notification-empty">
                      <div className="notif-empty-icon">
                        <Sparkles size={24} />
                      </div>
                      <h4>All Caught Up!</h4>
                      <p>You have no notifications right now.</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`notification-item ${notif.read ? "read" : "unread"}`}
                        onClick={() => markAsRead(notif.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            markAsRead(notif.id);
                          }
                        }}
                      >
                        <div className={`notification-icon-wrapper ${notif.type || "welcome"}`}>
                          {notif.type === "planner" ? (
                            <CalendarDays size={16} />
                          ) : notif.type === "quiz" ? (
                            <Brain size={16} />
                          ) : notif.type === "course" ? (
                            <BookOpen size={16} />
                          ) : (
                            <Sparkles size={16} />
                          )}
                        </div>
                        <div className="notification-content">
                          <div className="notification-item-header">
                            <h4 className="notification-item-title">{notif.title}</h4>
                            <span className="notification-time">{notif.time}</span>
                          </div>
                          <p className="notification-message">{notif.message}</p>
                        </div>
                        <div className="notification-item-actions">
                          {!notif.read && <span className="unread-dot" title="Unread" />}
                          <button
                            type="button"
                            className="notif-delete-btn"
                            onClick={(e) => removeNotification(notif.id, e)}
                            title="Dismiss notification"
                            aria-label="Dismiss notification"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="notification-dropdown-footer">
                    <button
                      type="button"
                      className="notif-clear-all"
                      onClick={clearAllNotifications}
                    >
                      <Trash2 size={13} />
                      <span>Clear all notifications</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* 100% REAL-DATA STATISTICS CARDS */}
        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-icon purple-icon"><Clock3 /></span>
              <span className="stat-trend"><TrendingUp size={13} /> Study</span>
            </div>
            <p>Total Study Time</p>
            <h2>{stats.totalStudyHours} <small>hrs</small></h2>
            <span className="stat-note">
              {stats.totalStudyHours === 0 ? "Start a session in Study Timer" : "Actual tracked time"}
            </span>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-icon blue-icon"><Target /></span>
              <span className="stat-trend"><TrendingUp size={13} /> Topics</span>
            </div>
            <p>Topics Completed</p>
            <h2>{stats.topicsCompleted}</h2>
            <span className="stat-note">
              {stats.topicsCompleted === 0 ? "Complete lessons or tasks" : "Keep it going!"}
            </span>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-icon pink-icon"><ClipboardCheck /></span>
              <span className="stat-trend">Practice</span>
            </div>
            <p>Quizzes Completed</p>
            <h2>{stats.quizzesCompleted}</h2>
            <span className="stat-note">
              {stats.quizzesCompleted === 0
                ? "Take a quiz to test skills"
                : `Average score: ${stats.averageQuizPercentage}% · Latest: ${stats.latestQuizPercentage}%`}
            </span>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-icon orange-icon"><Flame /></span>
              <span className="stat-trend">Streak</span>
            </div>
            <p>Daily Streak</p>
            <h2>{stats.streakDays} <small>days</small></h2>
            <span className="stat-note">
              {stats.streakDays === 0 ? "Study daily to build streak" : "Great consistency!"}
            </span>
          </div>
        </section>

        {/* DASHBOARD COLUMNS */}
        <section className="dashboard-content-grid">
          <div className="dashboard-left-column">
            {/* OVERALL PROGRESS */}
            <div className="dashboard-card progress-card">
              <div className="card-heading">
                <div>
                  <h2>Overall Progress</h2>
                  <p>Your learning journey so far</p>
                </div>
                <span className="small-tag">Live Data</span>
              </div>

              <div className="progress-content">
                <div
                  className="progress-circle"
                  style={{
                    background: `conic-gradient(#684cf5 ${stats.overallProgress * 3.6}deg, #eee8fc 0deg)`,
                  }}
                >
                  <div className="progress-inner">
                    <strong>{stats.overallProgress}%</strong>
                    <span>Completed</span>
                  </div>
                </div>

                <div className="progress-details">
                  <h3>
                    {stats.overallProgress === 0
                      ? "Start learning today!"
                      : stats.overallProgress >= 75
                      ? "Outstanding progress!"
                      : "You're making steady progress!"}
                  </h3>
                  <p>
                    {stats.overallProgress === 0
                      ? "Explore study materials and complete topics to advance your progress."
                      : "Keep completing topics to reach your learning targets."}
                  </p>
                  <div className="progress-legend">
                    <span><i className="legend-purple"></i> Completed</span>
                    <span><i className="legend-gray"></i> Remaining</span>
                  </div>
                </div>
              </div>
            </div>

            {/* REAL-DATA STUDY ACTIVITY GRAPH */}
            <div className="dashboard-card activity-card">
              <div className="card-heading">
                <div>
                  <h2>Study Activity</h2>
                  <p>
                    {activityFilter === "weekly"
                      ? "Your weekly learning hours (Asia/Kolkata)"
                      : "Your monthly learning hours (Asia/Kolkata)"}
                  </p>
                </div>
                <button
                  type="button"
                  className="small-tag filter-btn-tag"
                  onClick={toggleActivityFilter}
                  title="Switch between weekly and monthly activity"
                >
                  <RefreshCw size={11} />
                  <span>{activityFilter === "weekly" ? "Weekly" : "Monthly"}</span>
                </button>
              </div>

              <div className="activity-chart">
                <div className="chart-y-labels">
                  <span>{activityScaleMax}h</span>
                  <span>{Math.round(activityScaleMax * 0.66)}h</span>
                  <span>{Math.round(activityScaleMax * 0.33)}h</span>
                  <span>0h</span>
                </div>

                <div className="chart-area">
                  <div className="chart-grid-lines">
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>

                  <svg viewBox="0 0 600 190" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="studyGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#684cf5" />
                        <stop offset="100%" stopColor="#d94fce" />
                      </linearGradient>
                    </defs>

                    <polyline
                      points={activityPoints}
                      fill="none"
                      stroke="url(#studyGradient)"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>

                  <div className="chart-days">
                    {activityData.length > 0 ? (
                      activityData.map((d, index) => (
                        <span
                          key={index}
                          title={`${d.date}: ${d.hours} hrs (${d.minutes} mins)`}
                        >
                          {d.day}
                        </span>
                      ))
                    ) : (
                      <>
                        <span>Mon</span>
                        <span>Tue</span>
                        <span>Wed</span>
                        <span>Thu</span>
                        <span>Fri</span>
                        <span>Sat</span>
                        <span>Sun</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* QUICK ACCESS */}
            <div className="dashboard-card quick-access-card">
              <div className="card-heading">
                <div>
                  <h2>Quick Access</h2>
                  <p>Continue your learning</p>
                </div>
              </div>

              <div className="quick-access-grid">
                <Link to="/ai-assistant" className="quick-access-link">
                  <span className="quick-icon ai-quick"><Bot /></span>
                  <strong>AI Assistant</strong>
                  <small>Ask anything</small>
                </Link>

                <Link to="/pdf-analyzer" className="quick-access-link">
                  <span className="quick-icon pdf-quick">
                    <FileText />
                  </span>
                  <strong>PDF Analyzer</strong>
                  <small>Analyze documents</small>
                </Link>

                <Link to="/quiz" className="quick-access-link">
                  <span className="quick-icon quiz-quick"><Brain /></span>
                  <strong>Generate Quiz</strong>
                  <small>Test your knowledge</small>
                </Link>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="dashboard-right-column">
            {/* TODAY'S TASKS CHECKLIST (Connected directly to MongoDB) */}
            <div className="dashboard-card tasks-card">
              <div className="card-heading">
                <div>
                  <h2>Today's Tasks</h2>
                  <p>Your study checklist</p>
                </div>

                <span className="task-count">
                  {tasks.length} Tasks
                </span>
              </div>

              {tasks.length === 0 ? (
                <div className="tasks-empty-state">
                  <p>No tasks yet. Add study goals in Study Planner!</p>
                </div>
              ) : (
                [...tasks]
                  .sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1))
                  .slice(0, 5)
                  .map((task) => {
                    const taskId = task._id || task.id;
                    return (
                      <div
                        className="task-item clickable-task"
                        key={taskId}
                        onClick={() => handleToggleTask(taskId)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") handleToggleTask(taskId);
                        }}
                        title="Click to toggle completed"
                      >
                        <span className={task.completed ? "task-check checked" : "task-check"}>
                          {task.completed && <Check size={13} />}
                        </span>

                        <div>
                          <h4 className={task.completed ? "task-done" : ""}>
                            {task.title}
                          </h4>
                          <p>{task.subject || "Study"} · {task.time || "10:00"}</p>
                        </div>
                      </div>
                    );
                  })
              )}

              <Link to="/study-planner" className="view-all-btn">
                View Study Planner <ChevronRight size={15} />
              </Link>
            </div>

            {/* MY LEARNING (Connected directly to MongoDB user courses) */}
            <div className="dashboard-card learning-card">
              <div className="card-heading">
                <div>
                  <h2>My Learning</h2>
                  <p>Continue your courses</p>
                </div>
                <Link to="/courses" className="view-text">View All</Link>
              </div>

              {courses.length > 0 ? (
                courses.map((course, index) => {
                  const Icon = courseIcons[course.iconType] || BookOpen;
                  const progress = Math.min(100, Math.max(0, Number(course.progress) || 0));
                  const color = courseColors.includes(course.color)
                    ? course.color
                    : courseColors[index % courseColors.length];

                  return (
                    <Link
                      to="/courses"
                      className={`learning-item ${color}`}
                      key={course._id || course.courseId || index}
                    >
                      <div className={`course-logo ${color}`}>
                        <Icon size={20} />
                      </div>

                      <div className="course-info">
                        <h4>{course.title}</h4>
                        <p>Progress: {progress}%</p>
                        <div className="course-progress">
                          <span style={{ width: `${progress}%` }}></span>
                        </div>
                      </div>

                      <ChevronRight size={20} />
                    </Link>
                  );
                })
              ) : (
                <div className="learning-empty">
                  <p>No courses yet. Explore courses to get started.</p>
                </div>
              )}

              <Link to="/courses" className="browse-btn">
                Explore Learning <span>+</span>
              </Link>
            </div>

            {/* MOTIVATION */}
            <div className="motivation-card">
              <span><Sparkles size={14} /> Daily Inspiration</span>
              <h3>"The secret of getting ahead is getting started."</h3>
              <p>Take one step forward today.</p>
            </div>
          </div>
        </section>

        <footer className="dashboard-footer">
          Made for learners, powered by AI.
        </footer>
      </main>
    </div>
  );
}

export default Dashboard;
