import React, { useEffect, useState } from "react";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  RotateCcw,
  Trophy,
} from "lucide-react";
import "./Quiz.css";
import BackButton from "../components/BackButton";
import { quizAPI } from "../services/api";

const questions = [
  {
    question: "What is React?",
    options: [
      "A programming language",
      "A JavaScript library",
      "A database",
      "An operating system",
    ],
    answer: 1,
  },
  {
    question: "Which hook is used to manage state in React?",
    options: ["useEffect", "useState", "useRef", "useMemo"],
    answer: 1,
  },
  {
    question: "Which company developed JavaScript?",
    options: ["Microsoft", "Google", "Netscape", "Apple"],
    answer: 2,
  },
  {
    question: "Which HTML tag is used to create a link?",
    options: ["<link>", "<a>", "<href>", "<url>"],
    answer: 1,
  },
  {
    question: "Which method is used to display data in the console?",
    options: ["console.log()", "print()", "display()", "write()"],
    answer: 0,
  },
];

function Quiz() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(120);
  const [submitted, setSubmitted] = useState(false);
  const [started, setStarted] = useState(false);
  const [attemptId, setAttemptId] = useState(() => window.crypto.randomUUID());

  const handleSubmitQuiz = React.useCallback(() => {
    setSubmitted(true);
    quizAPI
      .submit({
        answers: selectedAnswers,
        quizTitle: "React Fundamentals Quiz",
        attemptId,
      })
      .then((result) => {
        if (!result.success) {
          window.alert(result.error || "Quiz results could not be saved.");
          return;
        }
        window.dispatchEvent(new Event("storage"));
      })
      .catch(() => window.alert("Quiz results could not be saved. Please try again."));
  }, [attemptId, selectedAnswers]);

  useEffect(() => {
    if (!started || submitted) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [started, submitted, handleSubmitQuiz]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  const handleSelect = (index) => {
    if (submitted) return;

    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestion]: index,
    });
  };

  const score = questions.reduce((total, question, index) => {
    return total + (selectedAnswers[index] === question.answer ? 1 : 0);
  }, 0);

  const restartQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswers({});
    setTimeLeft(120);
    setSubmitted(false);
    setStarted(true);
    setAttemptId(window.crypto.randomUUID());
  };

  const question = questions[currentQuestion];

  return (
    <div className="quiz-page">
      <BackButton />
      <div className="quiz-header">
        <div>
          <p className="quiz-label">LEARNING CENTER</p>
          <h1>Knowledge Quiz</h1>
          <p className="quiz-subtitle">
            Test your knowledge and improve your skills.
          </p>
        </div>

        {started && !submitted && (
          <div className={`quiz-timer ${timeLeft <= 20 ? "danger" : ""}`}>
            <Clock size={19} />
            <span>{formatTime(timeLeft)}</span>
          </div>
        )}
      </div>

      {!started ? (
        <div className="quiz-start-card">
          <div className="quiz-trophy">
            <Trophy size={42} />
          </div>

          <h2>React Fundamentals Quiz</h2>
          <p>Check how much you know about React and web development.</p>

          <div className="quiz-info">
            <div>
              <strong>05</strong>
              <span>Questions</span>
            </div>
            <div>
              <strong>02</strong>
              <span>Minutes</span>
            </div>
            <div>
              <strong>MCQ</strong>
              <span>Question Type</span>
            </div>
          </div>

          <button className="quiz-primary-btn" onClick={() => setStarted(true)}>
            Start Quiz <ChevronRight size={18} />
          </button>
        </div>
      ) : submitted ? (
        <div className="quiz-result-card">
          <div className="quiz-result-icon">
            <Trophy size={44} />
          </div>

          <h2>Quiz Completed!</h2>
          <p>Here is your quiz performance.</p>

          <div className="quiz-score">
            <strong>{score}/{questions.length}</strong>
            <span>Your Score</span>
          </div>

          <h3>
            {score >= 4
              ? "Excellent Work!"
              : score >= 2
              ? "Good Try!"
              : "Keep Practicing!"}
          </h3>

          <p>
            You answered {score} questions correctly out of {questions.length}.
          </p>

          <button className="quiz-primary-btn" onClick={restartQuiz}>
            <RotateCcw size={18} /> Try Again
          </button>
        </div>
      ) : (
        <div className="quiz-content">
          <div className="quiz-progress-area">
            <div className="quiz-progress-text">
              <span>Question {currentQuestion + 1} of {questions.length}</span>
              <span>{Math.round(((currentQuestion + 1) / questions.length) * 100)}%</span>
            </div>

            <div className="quiz-progress-bar">
              <div
                style={{
                  width: `${((currentQuestion + 1) / questions.length) * 100}%`,
                }}
              />
            </div>
          </div>

          <div className="quiz-question-card">
            <span className="quiz-question-number">
              QUESTION {currentQuestion + 1}
            </span>

            <h2>{question.question}</h2>

            <div className="quiz-options">
              {question.options.map((option, index) => (
                <button
                  key={index}
                  className={`quiz-option ${
                    selectedAnswers[currentQuestion] === index ? "selected" : ""
                  }`}
                  onClick={() => handleSelect(index)}
                >
                  <span className="option-letter">
                    {String.fromCharCode(65 + index)}
                  </span>
                  {option}
                  {selectedAnswers[currentQuestion] === index && (
                    <CheckCircle size={19} className="option-check" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="quiz-navigation">
            <button
              className="quiz-secondary-btn"
              disabled={currentQuestion === 0}
              onClick={() => setCurrentQuestion((q) => q - 1)}
            >
              <ChevronLeft size={18} /> Previous
            </button>

            {currentQuestion === questions.length - 1 ? (
              <button
                className="quiz-primary-btn"
                onClick={handleSubmitQuiz}
              >
                Submit Quiz
              </button>
            ) : (
              <button
                className="quiz-primary-btn"
                onClick={() => setCurrentQuestion((q) => q + 1)}
              >
                Next <ChevronRight size={18} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Quiz;
