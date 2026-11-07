import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
import {
  Users,
  Copy,
  Check,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Send,
  LogOut,
  Clock,
  Headphones,
} from "lucide-react";
import "./GroupStudy.css";
import BackButton from "../components/BackButton";
import SocketContext from "../context/socketContextValue";
import { authAPI } from "../services/api";

function GroupStudy() {
  const socket = useContext(SocketContext);

  // User Profile
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("studyBuddyProfile");
      return saved ? JSON.parse(saved) : { name: "Student" };
    } catch {
      return { name: "Student" };
    }
  });

  // Room State
  const [inRoom, setInRoom] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [participants, setParticipants] = useState([]);

  // Timer State
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [timerDuration, setTimerDuration] = useState(25 * 60);
  const [syncStatus, setSyncStatus] = useState("Timer ready");

  // Lo-Fi Audio Generator (Web Audio API)
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0.4);
  const [soundMode, setSoundMode] = useState("lofi"); // 'lofi', 'rain', 'binaural'
  const audioCtxRef = useRef(null);
  const gainNodeRef = useRef(null);
  const oscillatorNodesRef = useRef([]);

  // Chat State
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const chatBottomRef = useRef(null);

  // Fetch verified profile
  useEffect(() => {
    let isMounted = true;
    authAPI.getProfile().then((res) => {
      if (isMounted && res?.success && res.user) {
        setCurrentUser(res.user);
      }
    }).catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Web Audio Synth Stop Helper
  const stopAmbientAudio = useCallback(() => {
    try {
      oscillatorNodesRef.current.forEach((node) => {
        try {
          node.stop();
          node.disconnect();
        } catch {
          // Ignore
        }
      });
      oscillatorNodesRef.current = [];
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
      audioCtxRef.current = null;
    } catch {
      // Ignore
    }
  }, []);

  // Web Audio Synth Starter
  const startAmbientAudio = useCallback((mode = soundMode, vol = audioVolume) => {
    stopAmbientAudio();
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(vol, ctx.currentTime);
      masterGain.connect(ctx.destination);
      gainNodeRef.current = masterGain;

      if (mode === "rain") {
        // Brown/Pink noise buffer simulation for rain
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          output[i] = (b0 + b1 + b2 + white * 0.5362) * 0.11;
        }
        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(800, ctx.currentTime);

        whiteNoise.connect(filter);
        filter.connect(masterGain);
        whiteNoise.start();
        oscillatorNodesRef.current = [whiteNoise];
      } else if (mode === "binaural") {
        // 432Hz + 442Hz alpha focus beat
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(432, ctx.currentTime);
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(442, ctx.currentTime);

        const subGain = ctx.createGain();
        subGain.gain.setValueAtTime(0.3, ctx.currentTime);
        osc1.connect(subGain);
        osc2.connect(subGain);
        subGain.connect(masterGain);

        osc1.start();
        osc2.start();
        oscillatorNodesRef.current = [osc1, osc2];
      } else {
        // Warm Lo-Fi chord pads (Cmaj7 / Am9 soothing harmony)
        const freqs = [130.81, 164.81, 196.0, 246.94]; // C3, E3, G3, B3
        const nodes = freqs.map((freq) => {
          const osc = ctx.createOscillator();
          const oscGain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          oscGain.gain.setValueAtTime(0.08, ctx.currentTime);

          const lfo = ctx.createOscillator();
          lfo.frequency.setValueAtTime(0.2, ctx.currentTime);
          const lfoGain = ctx.createGain();
          lfoGain.gain.setValueAtTime(1.5, ctx.currentTime);
          lfo.connect(lfoGain);
          lfoGain.connect(osc.frequency);
          lfo.start();

          osc.connect(oscGain);
          oscGain.connect(masterGain);
          osc.start();
          return osc;
        });
        oscillatorNodesRef.current = nodes;
      }
    } catch (err) {
      console.warn("Audio synthesis could not start:", err);
    }
  }, [audioVolume, soundMode, stopAmbientAudio]);

  const toggleAudio = () => {
    if (audioPlaying) {
      stopAmbientAudio();
      setAudioPlaying(false);
    } else {
      startAmbientAudio(soundMode, audioVolume);
      setAudioPlaying(true);
    }
  };

  const handleVolumeChange = (newVol) => {
    setAudioVolume(newVol);
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setValueAtTime(newVol, audioCtxRef.current.currentTime);
    }
  };

  const handleSoundModeChange = (mode) => {
    setSoundMode(mode);
    if (audioPlaying) {
      startAmbientAudio(mode, audioVolume);
    }
  };

  // Timer Tick
  useEffect(() => {
    let interval = null;
    if (isRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setSyncStatus("Study sprint complete! 🎉");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timerSeconds]);

  // Socket Events Handling
  useEffect(() => {
    if (!socket || !inRoom) return undefined;

    const handleUserJoined = (data) => {
      if (data && data.userId) {
        setParticipants((prev) => {
          const exists = prev.some((p) => p.userId === data.userId);
          if (exists) return prev;
          return [...prev, { userId: data.userId, userName: data.userName || "Student" }];
        });
        // Announce our presence back so new member sees us
        socket.emit("room:announce_presence", { targetUserId: data.userId });
      }
    };

    const handleUserLeft = (data) => {
      if (data && data.userId) {
        setParticipants((prev) => prev.filter((p) => p.userId !== data.userId));
      }
    };

    const handleTimerUpdate = ({ action, secondsRemaining, by }) => {
      if (action === "start") {
        if (typeof secondsRemaining === "number") setTimerSeconds(secondsRemaining);
        setIsRunning(true);
        setSyncStatus(`Timer started by ${by || "peer"}`);
      } else if (action === "pause") {
        if (typeof secondsRemaining === "number") setTimerSeconds(secondsRemaining);
        setIsRunning(false);
        setSyncStatus(`Timer paused by ${by || "peer"}`);
      } else if (action === "reset") {
        if (typeof secondsRemaining === "number") {
          setTimerSeconds(secondsRemaining);
          setTimerDuration(secondsRemaining);
        }
        setIsRunning(false);
        setSyncStatus(`Timer reset by ${by || "peer"}`);
      }
    };

    const handleNewMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    };

    socket.on("room:user_joined", handleUserJoined);
    socket.on("room:user_left", handleUserLeft);
    socket.on("room:timer_update", handleTimerUpdate);
    socket.on("room:new_message", handleNewMessage);

    return () => {
      socket.off("room:user_joined", handleUserJoined);
      socket.off("room:user_left", handleUserLeft);
      socket.off("room:timer_update", handleTimerUpdate);
      socket.off("room:new_message", handleNewMessage);
    };
  }, [socket, inRoom]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopAmbientAudio();
    };
  }, [stopAmbientAudio]);

  // Join Room
  const handleJoinRoom = (codeToJoin) => {
    const code = (codeToJoin || inputCode).toUpperCase().trim();
    if (!code) {
      alert("Please enter a Room Code.");
      return;
    }
    setRoomCode(code);
    setInRoom(true);
    setParticipants([
      {
        userId: currentUser._id || "me",
        userName: `${currentUser.name || "Student"} (You)`,
      },
    ]);

    if (socket) {
      socket.emit("room:join", {
        roomCode: code,
        userName: currentUser.name || "Student",
      });
    }
  };

  const handleCreateRoom = () => {
    const randomCode = "STUDY-" + Math.floor(1000 + Math.random() * 9000);
    handleJoinRoom(randomCode);
  };

  const handleLeaveRoom = () => {
    if (socket) {
      socket.emit("room:leave");
    }
    stopAmbientAudio();
    setAudioPlaying(false);
    setInRoom(false);
    setRoomCode("");
    setParticipants([]);
    setMessages([]);
    setIsRunning(false);
  };

  const copyRoomCode = () => {
    navigator.clipboard?.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Timer Actions emitting to room
  const emitTimerAction = (action, secs = timerSeconds) => {
    if (action === "start") setIsRunning(true);
    if (action === "pause") setIsRunning(false);
    if (action === "reset") {
      setIsRunning(false);
      setTimerSeconds(secs);
      setTimerDuration(secs);
    }
    if (socket && inRoom) {
      socket.emit("room:timer_action", { action, secondsRemaining: secs });
    }
  };

  // Chat message send
  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;
    if (socket && inRoom) {
      socket.emit("room:message", { text: chatInput });
      setChatInput("");
    }
  };

  const sendCheer = (cheerText) => {
    if (socket && inRoom) {
      socket.emit("room:message", { text: cheerText });
    }
  };

  // Time format helper
  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const timerPct = Math.round(((timerDuration - timerSeconds) / timerDuration) * 100);

  return (
    <div className="group-study-page">
      <BackButton />

      {!inRoom ? (
        /* JOIN / CREATE ROOM SCREEN */
        <div className="gs-landing">
          <header className="gs-landing-header">
            <span className="gs-badge">REAL-TIME COLLABORATIVE LEARNING</span>
            <h1>Virtual Group Study Room</h1>
            <p>Study together with friends in a focused, synchronized environment.</p>
          </header>

          <div className="gs-join-card">
            <div className="gs-card-hero">
              <Users size={46} color="#7047eb" />
              <h3>Enter a Study Room</h3>
              <p>Join an active study session or create your own room to invite friends.</p>
            </div>

            <div className="gs-input-group">
              <input
                type="text"
                placeholder="Enter Room Code (e.g. STUDY-4821)"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                maxLength={15}
              />
              <button
                type="button"
                className="btn-primary-join"
                onClick={() => handleJoinRoom()}
              >
                Join Room
              </button>
            </div>

            <div className="gs-divider">
              <span>OR</span>
            </div>

            <button
              type="button"
              className="btn-create-room"
              onClick={handleCreateRoom}
            >
              <Sparkles size={18} /> Create New Study Room
            </button>

            <div className="gs-features-row">
              <div className="gs-feat-item">
                <Clock size={16} />
                <span>Synced Timer</span>
              </div>
              <div className="gs-feat-item">
                <Headphones size={16} />
                <span>Lo-Fi Music</span>
              </div>
              <div className="gs-feat-item">
                <Users size={16} />
                <span>Live Friends</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ACTIVE STUDY ROOM */
        <div className="gs-active-room">
          {/* ROOM HEADER */}
          <header className="gs-room-header">
            <div className="gs-room-info">
              <span className="gs-live-tag">
                <span className="live-dot" /> LIVE ROOM
              </span>
              <h2>Room: <strong>{roomCode}</strong></h2>
            </div>

            <div className="gs-room-actions">
              <button
                type="button"
                className="btn-copy-code"
                onClick={copyRoomCode}
                title="Copy Room Code to share with friends"
              >
                {copied ? <Check size={16} color="#16a34a" /> : <Copy size={16} />}
                <span>{copied ? "Copied!" : "Share Code"}</span>
              </button>

              <button
                type="button"
                className="btn-leave-room"
                onClick={handleLeaveRoom}
              >
                <LogOut size={16} /> Leave Room
              </button>
            </div>
          </header>

          {/* MAIN ROOM GRID */}
          <div className="gs-grid-layout">
            {/* LEFT / CENTER: TIMER & AMBIENT AUDIO */}
            <div className="gs-main-column">
              {/* SYNCHRONIZED TIMER CARD */}
              <section className="gs-timer-card">
                <div className="gs-timer-top">
                  <span className="gs-sync-pill">{syncStatus}</span>
                  <div className="gs-presets">
                    <button
                      type="button"
                      className={timerDuration === 25 * 60 ? "preset-btn active" : "preset-btn"}
                      onClick={() => emitTimerAction("reset", 25 * 60)}
                    >
                      25m
                    </button>
                    <button
                      type="button"
                      className={timerDuration === 45 * 60 ? "preset-btn active" : "preset-btn"}
                      onClick={() => emitTimerAction("reset", 45 * 60)}
                    >
                      45m
                    </button>
                    <button
                      type="button"
                      className={timerDuration === 60 * 60 ? "preset-btn active" : "preset-btn"}
                      onClick={() => emitTimerAction("reset", 60 * 60)}
                    >
                      60m
                    </button>
                  </div>
                </div>

                <div className="gs-clock-display">
                  <h1>{timeFormatted}</h1>
                  <div className="gs-timer-bar">
                    <div
                      className="gs-timer-fill"
                      style={{ width: `${timerPct}%` }}
                    />
                  </div>
                </div>

                <div className="gs-timer-controls">
                  {isRunning ? (
                    <button
                      type="button"
                      className="btn-timer-ctrl pause"
                      onClick={() => emitTimerAction("pause")}
                    >
                      <Pause size={20} /> Pause for All
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-timer-ctrl start"
                      onClick={() => emitTimerAction("start")}
                    >
                      <Play size={20} /> Start for All
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-timer-ctrl reset"
                    onClick={() => emitTimerAction("reset", timerDuration)}
                    title="Reset Timer"
                  >
                    <RotateCcw size={18} />
                  </button>
                </div>
              </section>

              {/* LO-FI AMBIENT MUSIC CARD */}
              <section className="gs-audio-card">
                <div className="gs-audio-header">
                  <div className="gs-audio-title">
                    <Headphones size={20} color="#7047eb" />
                    <div>
                      <h3>Lo-Fi & Focus Audio</h3>
                      <p>Calming soundscape to boost concentration</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`btn-audio-toggle ${audioPlaying ? "playing" : ""}`}
                    onClick={toggleAudio}
                  >
                    {audioPlaying ? <Volume2 size={18} /> : <VolumeX size={18} />}
                    <span>{audioPlaying ? "Playing" : "Sound Muted"}</span>
                  </button>
                </div>

                <div className="gs-audio-controls">
                  <div className="gs-sound-modes">
                    <button
                      type="button"
                      className={`sound-chip ${soundMode === "lofi" ? "active" : ""}`}
                      onClick={() => handleSoundModeChange("lofi")}
                    >
                      🎵 Lo-Fi Chords
                    </button>
                    <button
                      type="button"
                      className={`sound-chip ${soundMode === "rain" ? "active" : ""}`}
                      onClick={() => handleSoundModeChange("rain")}
                    >
                      🌧️ Soft Rain
                    </button>
                    <button
                      type="button"
                      className={`sound-chip ${soundMode === "binaural" ? "active" : ""}`}
                      onClick={() => handleSoundModeChange("binaural")}
                    >
                      🧠 432Hz Focus
                    </button>
                  </div>

                  <div className="gs-volume-slider">
                    <Volume2 size={15} color="#64748b" />
                    <input
                      type="range"
                      min="0.05"
                      max="1"
                      step="0.05"
                      value={audioVolume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    />
                  </div>
                </div>
              </section>
            </div>

            {/* RIGHT COLUMN: PARTICIPANTS & CHAT */}
            <div className="gs-side-column">
              {/* MEMBERS LIST */}
              <section className="gs-members-card">
                <div className="gs-card-title">
                  <Users size={18} color="#7047eb" />
                  <h3>Studying Together ({participants.length})</h3>
                </div>

                <div className="gs-members-list">
                  {participants.map((p, idx) => (
                    <div key={p.userId || idx} className="gs-member-item">
                      <div className="gs-member-avatar">
                        {(p.userName || "S").charAt(0).toUpperCase()}
                      </div>
                      <div className="gs-member-info">
                        <strong>{p.userName}</strong>
                        <span className="gs-member-status">
                          <span className="online-dot" /> Focusing
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* LIVE CHAT & MOTIVATION */}
              <section className="gs-chat-card">
                <div className="gs-card-title">
                  <Sparkles size={18} color="#7047eb" />
                  <h3>Room Cheers & Chat</h3>
                </div>

                <div className="gs-cheer-pills">
                  <button type="button" onClick={() => sendCheer("Let's focus! 🔥")}>
                    🔥 Focus
                  </button>
                  <button type="button" onClick={() => sendCheer("Keep going! 💪")}>
                    💪 Cheer
                  </button>
                  <button type="button" onClick={() => sendCheer("5m break ☕")}>
                    ☕ Break
                  </button>
                </div>

                <div className="gs-chat-messages">
                  {messages.length === 0 ? (
                    <div className="gs-chat-empty">
                      <p>Send a cheer or message to your study group!</p>
                    </div>
                  ) : (
                    messages.map((m) => (
                      <div
                        key={m.id}
                        className={`gs-chat-msg ${m.userId === currentUser._id ? "mine" : ""}`}
                      >
                        <div className="msg-header">
                          <span className="msg-sender">{m.userName}</span>
                          <span className="msg-time">{m.time}</span>
                        </div>
                        <p className="msg-text">{m.text}</p>
                      </div>
                    ))
                  )}
                  <div ref={chatBottomRef} />
                </div>

                <form onSubmit={handleSendMessage} className="gs-chat-input-row">
                  <input
                    type="text"
                    placeholder="Type a cheer..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    maxLength={200}
                  />
                  <button type="submit" className="btn-send-chat" disabled={!chatInput.trim()}>
                    <Send size={15} />
                  </button>
                </form>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GroupStudy;
