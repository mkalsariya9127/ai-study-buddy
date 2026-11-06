import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Plus,
  Clock3,
  Trash2,
  CheckCircle2,
  BookOpen,
  Target,
  ClipboardList,
} from "lucide-react";
import "./StudyPlanner.css";
import { tasksAPI } from "../services/api";

const defaultTasks = [];

function getSavedTasks() {
  try {
    const savedTasks = localStorage.getItem("studyBuddyTasks");
    if (savedTasks !== null) {
      const parsedTasks = JSON.parse(savedTasks);
      if (Array.isArray(parsedTasks)) {
        return parsedTasks;
      }
    }
  } catch (error) {
    console.error("Error loading tasks:", error);
  }
  return defaultTasks;
}

const todayFormatted = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  month: "short",
  day: "numeric",
});

function StudyPlanner() {
  const [tasks, setTasks] = useState(getSavedTasks);
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("10:00");

  // Load backend tasks on mount
  useEffect(() => {
    const loadBackendTasks = async () => {
      try {
        const res = await tasksAPI.getAll();
        if (res.success && Array.isArray(res.data)) {
          const formatted = res.data.map((t) => ({
            id: t._id || t.id,
            _id: t._id,
            subject: t.subject,
            title: t.title,
            time: t.time || "10:00",
            completed: Boolean(t.completed),
          }));
          setTasks(formatted);
          localStorage.setItem("studyBuddyTasks", JSON.stringify(formatted));
        }
      } catch (err) {
        console.warn("Using offline tasks cache:", err);
      }
    };

    loadBackendTasks();
  }, []);

  // Save tasks to localStorage as local cache
  useEffect(() => {
    localStorage.setItem("studyBuddyTasks", JSON.stringify(tasks));
  }, [tasks]);

  const completedCount = tasks.filter((task) => task.completed).length;
  const progress = tasks.length
    ? Math.round((completedCount / tasks.length) * 100)
    : 0;

  const addTask = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !title.trim() || !time) return;

    let newId;
    try {
      const res = await tasksAPI.create({
        subject: subject.trim(),
        title: title.trim(),
        time,
      });
      if (res.success && res.data?._id) {
        newId = res.data._id;
      } else {
        window.alert(res.error || "Task could not be saved.");
        return;
      }
    } catch {
      window.alert("Task could not be saved. Please try again.");
      return;
    }

    const newTask = {
      id: newId,
      subject: subject.trim(),
      title: title.trim(),
      time,
      completed: false,
    };

    setTasks((prev) => [...prev, newTask]);
    window.dispatchEvent(new Event("storage"));
    setSubject("");
    setTitle("");
    setTime("10:00");
  };

  const toggleTask = async (id) => {
    const targetTask = tasks.find((t) => t.id === id);
    const newCompleted = targetTask ? !targetTask.completed : true;

    try {
      const result = await tasksAPI.toggleComplete(id);
      if (!result.success) {
        window.alert(result.error || "Task could not be updated.");
        return;
      }
    } catch {
      window.alert("Task could not be updated. Please try again.");
      return;
    }

    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: newCompleted } : task
      )
    );
    window.dispatchEvent(new Event("storage"));
  };

  const deleteTask = async (id) => {
    try {
      const result = await tasksAPI.delete(id);
      if (!result.success) {
        window.alert(result.error || "Task could not be deleted.");
        return;
      }
    } catch {
      window.alert("Task could not be deleted. Please try again.");
      return;
    }

    setTasks((prev) => prev.filter((task) => task.id !== id));
    window.dispatchEvent(new Event("storage"));
  };

  return (
    <div className="planner-page">
      <header className="planner-header">
        <Link to="/dashboard" className="planner-back">
          <ArrowLeft size={19} />
          Dashboard
        </Link>

        <div className="planner-header-title">
          <CalendarDays size={21} />
          Study Planner
        </div>
      </header>

      <main className="planner-container">
        <section className="planner-intro">
          <div>
            <span className="planner-eyebrow">PLAN YOUR SUCCESS</span>
            <h1>Study Planner</h1>
            <p>Organize your study time and achieve your learning goals.</p>
          </div>

          <div className="planner-date">
            <CalendarDays size={19} />
            <span>{todayFormatted}</span>
          </div>
        </section>

        <section className="planner-overview">
          <div className="planner-overview-card">
            <div className="planner-overview-icon purple">
              <ClipboardList size={21} />
            </div>
            <div>
              <span>Total Tasks</span>
              <strong>{tasks.length}</strong>
            </div>
          </div>

          <div className="planner-overview-card">
            <div className="planner-overview-icon green">
              <CheckCircle2 size={21} />
            </div>
            <div>
              <span>Completed</span>
              <strong>{completedCount}</strong>
            </div>
          </div>

          <div className="planner-overview-card">
            <div className="planner-overview-icon orange">
              <Target size={21} />
            </div>
            <div>
              <span>Remaining</span>
              <strong>{tasks.length - completedCount}</strong>
            </div>
          </div>
        </section>

        <section className="planner-progress-card">
          <div className="planner-progress-heading">
            <div>
              <h2>Daily Progress</h2>
              <p>Keep going! Every completed task brings you closer to your goal.</p>
            </div>
            <strong>{progress}%</strong>
          </div>

          <div className="planner-progress-track">
            <div
              className="planner-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          <span className="planner-progress-caption">
            {completedCount} of {tasks.length} tasks completed
          </span>
        </section>

        <section className="planner-content">
          <div className="planner-task-section">
            <div className="planner-section-heading">
              <div>
                <h2>Today's Tasks</h2>
                <p>Your daily learning checklist</p>
              </div>

              <span className="planner-task-count">
                {tasks.length} tasks
              </span>
            </div>

            <div className="planner-task-list">
              {tasks.length === 0 ? (
                <div className="planner-empty">
                  <BookOpen size={30} />
                  <h3>No tasks yet</h3>
                  <p>Add your first study task to get started.</p>
                </div>
              ) : (
                [...tasks]
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((task) => (
                    <article
                      className={`planner-task ${
                        task.completed ? "is-completed" : ""
                      }`}
                      key={task.id}
                    >
                      <button
                        className="planner-check"
                        onClick={() => toggleTask(task.id)}
                        aria-label={
                          task.completed
                            ? "Mark pending"
                            : "Mark completed"
                        }
                      >
                        {task.completed && (
                          <CheckCircle2 size={21} />
                        )}
                      </button>

                      <div className="planner-task-info">
                        <span className="planner-task-subject">
                          {task.subject}
                        </span>

                        <h3>{task.title}</h3>

                        <span className="planner-task-time">
                          <Clock3 size={14} />
                          {task.time}
                        </span>
                      </div>

                      <span
                        className={`planner-status ${
                          task.completed ? "done" : ""
                        }`}
                      >
                        {task.completed ? "Completed" : "Pending"}
                      </span>

                      <button
                        className="planner-delete"
                        onClick={() => deleteTask(task.id)}
                        aria-label="Delete task"
                      >
                        <Trash2 size={17} />
                      </button>
                    </article>
                  ))
              )}
            </div>
          </div>

          <aside className="planner-add-card">
            <div className="planner-add-heading">
              <div className="planner-add-icon">
                <Plus size={21} />
              </div>

              <div>
                <h2>Add New Task</h2>
                <p>Plan your next study session</p>
              </div>
            </div>

            <form onSubmit={addTask}>
              <label htmlFor="planner-subject">Subject</label>
              <input
                id="planner-subject"
                type="text"
                placeholder="e.g. React JS"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />

              <label htmlFor="planner-title">Task name</label>
              <input
                id="planner-title"
                type="text"
                placeholder="What do you want to study?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              <label htmlFor="planner-time">Study time</label>
              <input
                id="planner-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />

              <button className="planner-add-button" type="submit">
                <Plus size={18} />
                Add Study Task
              </button>
            </form>
          </aside>
        </section>
      </main>
    </div>
  );
}

export default StudyPlanner;
