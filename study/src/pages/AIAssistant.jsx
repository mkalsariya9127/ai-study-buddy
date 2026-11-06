import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Bot,
  Send,
  Plus,
  Sparkles,
  BookOpen,
  Brain,
  FileText,
  User,
  Copy,
  Trash2,
  Check,
  MessageSquare,
  Code2,
} from "lucide-react";
import "./AIAssistant.css";
import { aiAPI } from "../services/api";

const quickPrompts = [
  { icon: BookOpen, text: "Explain React Components and State Hooks" },
  { icon: Brain, text: "Top Exam Preparation Strategies & Active Recall" },
  { icon: Code2, text: "Python Functions and Clean Coding Examples" },
  { icon: FileText, text: "Database Basics: SQL vs NoSQL Differences" },
];

const SESSIONS_STORAGE_KEY = "studyBuddyChatSessions";
const ACTIVE_SESSION_KEY = "studyBuddyActiveSessionId";

let sessionCounter = 0;
function generateSessionId() {
  sessionCounter += 1;
  return `session-${sessionCounter}-${Math.random().toString(36).slice(2, 7)}`;
}

function getFormattedTimeString() {
  try {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Just now";
  }
}

const INITIAL_SESSIONS = [
  {
    id: "session-default",
    title: "Study Guidance & Overview",
    updatedAt: "Just now",
    messages: [
      {
        role: "assistant",
        text: "Hey! 👋 I'm your AI Study Assistant. I can help you understand topics, prepare for exams, create study plans, and more. What would you like to learn today?",
        time: "Just now",
      },
    ],
  },
];

function getSavedSessions() {
  try {
    const saved = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Error loading chat sessions:", e);
  }
  return INITIAL_SESSIONS;
}

function getSavedActiveId(sessions) {
  try {
    const savedId = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (savedId && sessions.some((s) => s.id === savedId)) {
      return savedId;
    }
  } catch (e) {
    console.error("Error loading active session id:", e);
  }
  return sessions[0]?.id || "session-default";
}

function renderInlineStyles(text) {
  const tokens = text.split(/(\*\*.*?\*\*|`.*?`)/g);

  return tokens.map((token, i) => {
    if (token.startsWith("**") && token.endsWith("**")) {
      return <strong key={i}>{token.slice(2, -2)}</strong>;
    }
    if (token.startsWith("`") && token.endsWith("`")) {
      return (
        <code key={i} className="ai-inline-code">
          {token.slice(1, -1)}
        </code>
      );
    }
    return token;
  });
}

function formatMessageContent(text) {
  if (!text) return null;

  // Split code blocks
  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, partIndex) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      const inner = part.slice(3, -3).trim();
      const lines = inner.split("\n");
      const firstLine = lines[0].trim();
      const hasLang = /^[a-z0-9_-]+$/i.test(firstLine);
      const language = hasLang ? firstLine : "code";
      const code = (hasLang ? lines.slice(1) : lines).join("\n");

      return (
        <div key={partIndex} className="ai-code-block">
          <div className="ai-code-header">{language}</div>
          <pre>
            <code>{code}</code>
          </pre>
        </div>
      );
    }

    const lines = part.split("\n");
    return (
      <div key={partIndex} className="ai-text-block">
        {lines.map((line, lineIndex) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={lineIndex} className="ai-paragraph-break" />;
          }

          if (trimmed.startsWith("### ")) {
            return (
              <h4 key={lineIndex} className="ai-content-h4">
                {renderInlineStyles(trimmed.slice(4))}
              </h4>
            );
          }

          if (trimmed.startsWith("## ")) {
            return (
              <h3 key={lineIndex} className="ai-content-h3">
                {renderInlineStyles(trimmed.slice(3))}
              </h3>
            );
          }

          if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
            return (
              <div key={lineIndex} className="ai-content-bullet">
                <span className="bullet-dot">•</span>
                <span>{renderInlineStyles(trimmed.slice(2))}</span>
              </div>
            );
          }

          const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
          if (numberedMatch) {
            return (
              <div key={lineIndex} className="ai-content-bullet numbered">
                <span className="bullet-num">{numberedMatch[1]}.</span>
                <span>{renderInlineStyles(numberedMatch[2])}</span>
              </div>
            );
          }

          return (
            <p key={lineIndex} className="ai-content-p">
              {renderInlineStyles(line)}
            </p>
          );
        })}
      </div>
    );
  });
}

function AIAssistant() {
  const [sessions, setSessions] = useState(getSavedSessions);
  const [activeSessionId, setActiveSessionId] = useState(() =>
    getSavedActiveId(sessions)
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const bottomRef = useRef(null);

  // Active session object
  const activeSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0] || {
      id: "session-fallback",
      title: "Study Chat",
      messages: [],
    };

  const messages = activeSession.messages || [];
  const messagesCount = messages.length;

  // Persist sessions & active session id
  useEffect(() => {
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
      localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId);
    } catch (err) {
      console.warn("Could not save sessions to storage:", err);
    }
  }, [sessions, activeSessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesCount, loading]);

  const handleNewChat = () => {
    const newSession = {
      id: generateSessionId(),
      title: "New Study Chat",
      updatedAt: "Just now",
      messages: [
        {
          role: "assistant",
          text: "New chat started! 🚀 What would you like to study or revise today?",
          time: "Just now",
        },
      ],
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const selectSession = (id) => {
    setActiveSessionId(id);
  };

  const deleteSession = (id, event) => {
    if (event) event.stopPropagation();

    const filtered = sessions.filter((s) => s.id !== id);

    if (filtered.length === 0) {
      const reset = [
        {
          id: generateSessionId(),
          title: "Study Guidance & Overview",
          updatedAt: "Just now",
          messages: [
            {
              role: "assistant",
              text: "Hey! 👋 I'm your AI Study Assistant. What would you like to learn today?",
              time: "Just now",
            },
          ],
        },
      ];
      setSessions(reset);
      setActiveSessionId(reset[0].id);
      return;
    }

    setSessions(filtered);
    if (activeSessionId === id) {
      setActiveSessionId(filtered[0].id);
    }
  };

  const clearAllSessions = () => {
    if (!window.confirm("Are you sure you want to clear all chat history?")) {
      return;
    }

    const reset = [
      {
        id: generateSessionId(),
        title: "Study Guidance & Overview",
        updatedAt: "Just now",
        messages: [
          {
            role: "assistant",
            text: "Chat history cleared! What would you like to learn now?",
            time: "Just now",
          },
        ],
      },
    ];
    setSessions(reset);
    setActiveSessionId(reset[0].id);
  };

  const clearCurrentChat = () => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeSessionId) return s;
        return {
          ...s,
          messages: [
            {
              role: "assistant",
              text: "Chat reset! Feel free to ask any question about your studies.",
              time: "Just now",
            },
          ],
        };
      })
    );
  };

  const copyMessage = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

  const sendMessage = async (text = input) => {
    const message = text.trim();
    if (!message || loading) return;

    setInput("");
    setLoading(true);

    const timeString = getFormattedTimeString();

    // Smart title generation if title is default
    const shouldUpdateTitle =
      activeSession.title === "New Study Chat" ||
      activeSession.title === "Study Guidance & Overview";

    const newTitle = shouldUpdateTitle
      ? message.length > 28
        ? `${message.slice(0, 28)}...`
        : message
      : activeSession.title;

    // Update with user message
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeSessionId) return s;
        return {
          ...s,
          title: newTitle,
          updatedAt: "Just now",
          messages: [
            ...(s.messages || []),
            { role: "user", text: message, time: timeString },
          ],
        };
      })
    );

    try {
      const res = await aiAPI.chat(message, messages);

      if (res && res.success && res.reply) {
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== activeSessionId) return s;
            return {
              ...s,
              updatedAt: "Just now",
              messages: [
                ...(s.messages || []),
                { role: "assistant", text: res.reply, time: timeString },
              ],
            };
          })
        );
        return;
      }

      // If backend returned an error message, show it clearly
      const fallbackReply =
        res?.error ||
        `### 💡 Study Guide\n\nCould not fetch an AI response at this moment. Please check your network connection and try again.`;

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== activeSessionId) return s;
          return {
            ...s,
            updatedAt: "Just now",
            messages: [
              ...(s.messages || []),
              { role: "assistant", text: fallbackReply, time: timeString },
            ],
          };
        })
      );
    } catch (err) {
      console.warn("AI Backend notice:", err);
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== activeSessionId) return s;
          return {
            ...s,
            updatedAt: "Just now",
            messages: [
              ...(s.messages || []),
              {
                role: "assistant",
                text: "### ⚠️ Notice\n\nUnable to reach the assistant server right now. Please verify that the backend is running on port 5000.",
                time: timeString,
              },
            ],
          };
        })
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-page">
      {/* SIDEBAR */}
      <aside className="ai-sidebar">
        <Link to="/dashboard" className="ai-brand">
          <span className="ai-brand-icon">
            <Sparkles size={21} />
          </span>
          <span>StudyBuddy</span>
        </Link>

        <Link to="/dashboard" className="ai-back-link">
          <ArrowLeft size={18} />
          Back to Dashboard
        </Link>

        <button
          type="button"
          className="ai-new-chat"
          onClick={handleNewChat}
        >
          <Plus size={18} />
          New Chat
        </button>

        {/* CHAT HISTORY SECTION */}
        <div className="ai-history-section">
          <div className="ai-sidebar-label-wrap">
            <span className="ai-sidebar-label">CHAT HISTORY</span>
            {sessions.length > 0 && (
              <span className="ai-session-count">{sessions.length}</span>
            )}
          </div>

          <div className="ai-history-list">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`ai-history-item ${
                  session.id === activeSessionId ? "active" : ""
                }`}
                onClick={() => selectSession(session.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") selectSession(session.id);
                }}
              >
                <div className="ai-history-icon">
                  <MessageSquare size={14} />
                </div>
                <div className="ai-history-details">
                  <span className="ai-history-title">{session.title}</span>
                  <small className="ai-history-time">
                    {session.updatedAt || "Recent"}
                  </small>
                </div>
                <button
                  type="button"
                  className="ai-history-delete-btn"
                  onClick={(e) => deleteSession(session.id, e)}
                  title="Delete chat"
                  aria-label="Delete chat"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* SIDEBAR FOOTER */}
        <div className="ai-sidebar-bottom">
          <button
            type="button"
            className="ai-clear-history-btn"
            onClick={clearAllSessions}
            title="Clear all chat history"
          >
            <Trash2 size={13} />
            <span>Clear All History</span>
          </button>
          <div className="ai-status-indicator">
            <div className="ai-online-dot" />
            <span>AI Assistant Online</span>
          </div>
        </div>
      </aside>

      {/* MAIN CHAT AREA */}
      <main className="ai-main">
        <header className="ai-header">
          <div className="ai-header-info">
            <div className="ai-avatar">
              <Bot size={22} />
            </div>
            <div>
              <h2>{activeSession.title || "AI Study Assistant"}</h2>
              <p>
                <span /> Ready to help you learn
              </p>
            </div>
          </div>

          <div className="ai-header-actions">
            <button
              type="button"
              className="ai-clear-btn"
              onClick={handleNewChat}
              title="Start a fresh chat"
            >
              <Plus size={16} />
              <span>New Chat</span>
            </button>
            <button
              type="button"
              className="ai-clear-btn"
              onClick={clearCurrentChat}
              title="Reset current chat"
            >
              <Trash2 size={16} />
              <span>Clear Chat</span>
            </button>
          </div>
        </header>

        <section className="ai-chat-area">
          <div className="ai-chat-content">
            {messages.length <= 1 && (
              <div className="ai-welcome">
                <div className="ai-welcome-icon">
                  <Sparkles size={30} />
                </div>
                <h1>Your personal study tutor.</h1>
                <p>
                  Ask any question, understand complex concepts, generate code
                  snippets, and prepare for exams with your AI Study Assistant.
                </p>

                <div className="ai-quick-prompts">
                  {quickPrompts.map((prompt, index) => {
                    const Icon = prompt.icon;
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => sendMessage(prompt.text)}
                      >
                        <Icon size={19} />
                        <span>{prompt.text}</span>
                        <ArrowLeft className="ai-prompt-arrow" size={16} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="ai-messages">
              {messages.map((message, index) => (
                <div
                  className={`ai-message-row ${message.role}`}
                  key={index}
                >
                  <div className="ai-message-avatar">
                    {message.role === "assistant" ? (
                      <Bot size={19} />
                    ) : (
                      <User size={19} />
                    )}
                  </div>

                  <div className="ai-message-content">
                    <div className="ai-message-header">
                      <span className="ai-message-name">
                        {message.role === "assistant"
                          ? "StudyBuddy AI"
                          : "You"}
                      </span>
                      {message.time && (
                        <span className="ai-message-time">
                          {message.time}
                        </span>
                      )}
                    </div>

                    <div className="ai-message-bubble">
                      {formatMessageContent(message.text)}
                    </div>

                    {message.role === "assistant" && (
                      <button
                        type="button"
                        className="ai-copy-btn"
                        onClick={() => copyMessage(message.text, index)}
                        title="Copy message"
                      >
                        {copiedIndex === index ? (
                          <>
                            <Check size={14} color="#16a34a" />
                            <span style={{ color: "#16a34a" }}>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="ai-message-row assistant">
                  <div className="ai-message-avatar">
                    <Bot size={19} />
                  </div>
                  <div className="ai-message-content">
                    <div className="ai-message-name">StudyBuddy AI</div>
                    <div className="ai-typing">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>
        </section>

        <footer className="ai-input-section">
          <form
            className="ai-input-box"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
          >
            <input
              type="text"
              placeholder="Ask anything about React, Python, SQL, exams..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              aria-label="Send message"
            >
              <Send size={18} />
            </button>
          </form>
          <p>StudyBuddy AI can make mistakes. Verify critical exam information.</p>
        </footer>
      </main>
    </div>
  );
}

export default AIAssistant;
