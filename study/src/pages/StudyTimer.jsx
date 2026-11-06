import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Timer, Play, Pause, RotateCcw, Coffee, BookOpen } from "lucide-react";
import "./StudyTimer.css";
import { timerAPI } from "../services/api";

const MODES = {
  study: { name: "Study Focus", time: 25 * 60, icon: BookOpen, desc: "Stay focused on your study goals without distractions." },
  shortBreak: { name: "Short Break", time: 5 * 60, icon: Coffee, desc: "Take a breath, stretch, and relax for a few minutes." },
  longBreak: { name: "Long Break", time: 15 * 60, icon: Coffee, desc: "Step away, grab a drink, and recharge your mind." },
};

function StudyTimer() {
  const [activeMode, setActiveMode] = useState("study");
  const [timeLeft, setTimeLeft] = useState(MODES.study.time);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const sessionStartTimeRef = useRef(null);

  // Load backend stats on mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await timerAPI.getStats();
        if (res.success && res.stats?.totalSessions) {
          setSessionsCompleted(res.stats.totalSessions);
        }
      } catch (err) {
        console.warn("Using local timer stats:", err);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    if (!sessionStartTimeRef.current) {
      sessionStartTimeRef.current = new Date();
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          clearInterval(interval);

          const now = new Date();
          const targetSeconds = MODES[activeMode]?.time || 1500;
          const targetMinutes = Number((targetSeconds / 60).toFixed(1));

          // Log real session to MongoDB
          timerAPI.logSession({
            mode: activeMode,
            durationSeconds: targetSeconds,
            durationMinutes: targetMinutes,
            startTime: sessionStartTimeRef.current || new Date(now.getTime() - targetSeconds * 1000),
            endTime: now,
            requestId: window.crypto.randomUUID(),
          }).then((result) => {
            if (!result.success) {
              window.alert(result.error || "Your study session could not be saved.");
              return;
            }
            window.dispatchEvent(new Event("storage"));
            if (activeMode === "study") setSessionsCompleted((count) => count + 1);
          }).catch(() => {
            window.alert("Your study session could not be saved. Please try again.");
          });

          sessionStartTimeRef.current = null;

          if (activeMode === "study") {
            alert("Focus session complete! Great job. Time for a break!");
          } else {
            alert("Break finished! Ready to get back to learning?");
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, activeMode]);

  const switchMode = (modeKey) => {
    setActiveMode(modeKey);
    setIsRunning(false);
    setTimeLeft(MODES[modeKey].time);
  };

  const toggleTimer = () => {
    setIsRunning((prev) => !prev);
  };

  const resetTimer = () => {
    setIsRunning(false);
    sessionStartTimeRef.current = null;
    setTimeLeft(MODES[activeMode].time);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const currentModeInfo = MODES[activeMode];
  const IconComponent = currentModeInfo.icon;

  return (
    <main className="study-timer-page">
      <header className="study-timer-header">
        <Link to="/dashboard" className="study-timer-back">
          <ArrowLeft size={18} />
          Back to Dashboard
        </Link>

        <div className="study-timer-title">
          <Timer size={21} />
          <span>Pomodoro Study Timer</span>
        </div>
      </header>

      <section className="study-timer-content">
        <div className="study-timer-card">
          <div className="timer-mode-pills">
            <button
              type="button"
              className={`timer-pill ${activeMode === "study" ? "active" : ""}`}
              onClick={() => switchMode("study")}
            >
              Focus (25m)
            </button>
            <button
              type="button"
              className={`timer-pill ${activeMode === "shortBreak" ? "active" : ""}`}
              onClick={() => switchMode("shortBreak")}
            >
              Short Break (5m)
            </button>
            <button
              type="button"
              className={`timer-pill ${activeMode === "longBreak" ? "active" : ""}`}
              onClick={() => switchMode("longBreak")}
            >
              Long Break (15m)
            </button>
          </div>

          <span className="study-timer-icon">
            <IconComponent size={30} />
          </span>

          <p className="study-timer-eyebrow">
            {activeMode === "study" ? "FOCUS SESSION" : "REST TIME"}
          </p>

          <h1 className="timer-countdown">{formattedTime}</h1>
          <p>{currentModeInfo.desc}</p>

          <div className="timer-action-buttons">
            <button
              type="button"
              className={`timer-control-btn ${isRunning ? "pause" : "start"}`}
              onClick={toggleTimer}
            >
              {isRunning ? (
                <>
                  <Pause size={18} /> Pause
                </>
              ) : (
                <>
                  <Play size={18} /> Start
                </>
              )}
            </button>

            <button
              type="button"
              className="timer-control-btn reset"
              onClick={resetTimer}
              title="Reset Timer"
            >
              <RotateCcw size={18} /> Reset
            </button>
          </div>

          <div className="timer-stats">
            <span>Completed Focus Sessions: <strong>{sessionsCompleted}</strong></span>
          </div>
        </div>
      </section>
    </main>
  );
}

export default StudyTimer;
