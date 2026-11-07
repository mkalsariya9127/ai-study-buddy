import React, { useState, useEffect } from "react";
import {
  Map,
  Sparkles,
  Calendar,
  CheckCircle2,
  Circle,
  Trash2,
  ArrowRight,
  X,
} from "lucide-react";
import "./StudyRoadmap.css";
import BackButton from "../components/BackButton";
import { roadmapAPI } from "../services/api";

function StudyRoadmap() {
  const [roadmaps, setRoadmaps] = useState([]);
  const [activeRoadmapId, setActiveRoadmapId] = useState(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [goal, setGoal] = useState("");
  const [durationDays, setDurationDays] = useState(14);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchRoadmaps = async () => {
      try {
        const res = await roadmapAPI.getAll();
        if (isMounted && res.success && Array.isArray(res.data)) {
          setRoadmaps(res.data);
          if (res.data.length > 0) {
            setActiveRoadmapId((prev) => prev || res.data[0]._id);
          }
        }
      } catch (err) {
        console.warn("Could not load roadmaps:", err);
      }
    };
    fetchRoadmaps();
    return () => {
      isMounted = false;
    };
  }, []);

  const activeRoadmap =
    roadmaps.find((r) => r._id === activeRoadmapId) || roadmaps[0] || null;

  const handleToggleDay = async (day) => {
    if (!activeRoadmap) return;
    try {
      const res = await roadmapAPI.toggleMilestone(activeRoadmap._id, day);
      if (res.success && res.data) {
        setRoadmaps((prev) =>
          prev.map((r) => (r._id === activeRoadmap._id ? res.data : r))
        );
      }
    } catch (err) {
      console.warn("Could not toggle milestone:", err);
    }
  };

  const handleCreateRoadmap = async (e) => {
    e.preventDefault();
    if (!goal.trim()) {
      alert("Please enter a goal or topic.");
      return;
    }

    setGenerating(true);
    try {
      const res = await roadmapAPI.generateAI(goal, durationDays);
      if (res.success && res.data) {
        setRoadmaps((prev) => [res.data, ...prev]);
        setActiveRoadmapId(res.data._id);
        setShowModal(false);
        setGoal("");
      } else {
        alert(res?.message || "Could not generate roadmap.");
      }
    } catch (err) {
      alert("Error generating roadmap. Please try again.");
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteRoadmap = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this study roadmap?")) return;

    try {
      await roadmapAPI.delete(id);
      const remaining = roadmaps.filter((r) => r._id !== id);
      setRoadmaps(remaining);
      if (activeRoadmapId === id) {
        setActiveRoadmapId(remaining[0]?._id || null);
      }
    } catch (err) {
      alert("Could not delete roadmap.");
      console.error(err);
    }
  };

  return (
    <div className="roadmap-page">
      <BackButton />

      <header className="roadmap-header">
        <div>
          <span className="rm-badge">SMART CURRICULUM ENGINE</span>
          <h1>AI Study Roadmap</h1>
          <p>Structured day-by-day milestones designed by AI to help you achieve your goals.</p>
        </div>

        <button
          type="button"
          className="btn-create-rm"
          onClick={() => setShowModal(true)}
        >
          <Sparkles size={18} /> Generate AI Roadmap
        </button>
      </header>

      {/* ROADMAP SELECTOR TABS */}
      {roadmaps.length > 0 && (
        <div className="rm-tabs-bar">
          {roadmaps.map((rm) => (
            <div
              key={rm._id}
              className={`rm-tab-chip ${activeRoadmapId === rm._id ? "active" : ""}`}
              onClick={() => setActiveRoadmapId(rm._id)}
            >
              <span>{rm.goal} ({rm.durationDays}d)</span>
              <button
                type="button"
                className="rm-delete-btn"
                onClick={(e) => handleDeleteRoadmap(rm._id, e)}
                title="Delete roadmap"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ACTIVE ROADMAP VIEW */}
      {activeRoadmap ? (
        <div className="rm-content-layout">
          {/* PROGRESS OVERVIEW */}
          <section className="rm-overview-card">
            <div className="rm-overview-header">
              <div>
                <h2>{activeRoadmap.goal}</h2>
                <p>
                  <Calendar size={15} /> {activeRoadmap.durationDays}-Day Learning Plan
                </p>
              </div>
              <div className="rm-progress-badge">
                <span className="rm-pct">{activeRoadmap.progress || 0}%</span>
                <span>Complete</span>
              </div>
            </div>

            <div className="rm-progress-track">
              <div
                className="rm-progress-fill"
                style={{ width: `${activeRoadmap.progress || 0}%` }}
              />
            </div>
          </section>

          {/* DAY-BY-DAY TIMELINE */}
          <section className="rm-timeline">
            {activeRoadmap.milestones.map((m) => (
              <div
                key={m.day}
                className={`rm-milestone-card ${m.completed ? "completed" : ""}`}
              >
                <div className="rm-milestone-left">
                  <button
                    type="button"
                    className="rm-check-btn"
                    onClick={() => handleToggleDay(m.day)}
                    title={m.completed ? "Mark incomplete" : "Mark day complete"}
                  >
                    {m.completed ? (
                      <CheckCircle2 size={24} color="#16a34a" />
                    ) : (
                      <Circle size={24} color="#94a3b8" />
                    )}
                  </button>
                  <span className="rm-day-pill">Day {m.day}</span>
                </div>

                <div className="rm-milestone-body">
                  <h3>{m.title}</h3>
                  {m.description && <p className="rm-desc">{m.description}</p>}

                  {Array.isArray(m.tasks) && m.tasks.length > 0 && (
                    <ul className="rm-tasks-list">
                      {m.tasks.map((task, tIdx) => (
                        <li key={tIdx}>
                          <ArrowRight size={13} /> {task}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rm-milestone-right">
                  <span className="rm-status-text">
                    {m.completed ? "Completed (+30 XP)" : "Pending"}
                  </span>
                </div>
              </div>
            ))}
          </section>
        </div>
      ) : (
        <div className="rm-empty-state">
          <Map size={50} color="#7047eb" />
          <h3>No Study Roadmaps Yet</h3>
          <p>Tell AI what you want to learn, and get an interactive day-by-day plan instantly.</p>
          <button
            type="button"
            className="btn-create-rm"
            onClick={() => setShowModal(true)}
          >
            <Sparkles size={18} /> Create Your First Roadmap
          </button>
        </div>
      )}

      {/* CREATE ROADMAP MODAL */}
      {showModal && (
        <div className="rm-modal-overlay">
          <div className="rm-modal-card">
            <div className="rm-modal-header">
              <div className="rm-modal-title">
                <Sparkles size={20} color="#7047eb" />
                <h3>Create AI Study Roadmap</h3>
              </div>
              <button
                type="button"
                className="rm-close-btn"
                onClick={() => setShowModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRoadmap} className="rm-modal-form">
              <label>What is your study goal or subject?</label>
              <input
                type="text"
                placeholder="e.g. Master React & Node.js, Class 12 Board Exam Physics, DSA in 30 Days"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                disabled={generating}
                required
              />

              <label>Target Duration (Days)</label>
              <select
                value={durationDays}
                onChange={(e) => setDurationDays(parseInt(e.target.value, 10))}
                disabled={generating}
              >
                <option value={7}>7 Days (Fast Sprint)</option>
                <option value={14}>14 Days (Standard 2-Week Plan)</option>
                <option value={30}>30 Days (Comprehensive Mastery)</option>
                <option value={60}>60 Days (In-Depth Curriculum)</option>
              </select>

              <div className="rm-modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowModal(false)}
                  disabled={generating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={generating || !goal.trim()}
                >
                  {generating ? "Designing Roadmap..." : "Generate Roadmap"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudyRoadmap;
