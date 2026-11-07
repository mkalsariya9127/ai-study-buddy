const http = require("http");
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");
const csrfProtection = require("./middleware/csrfMiddleware");
const { initializeSocket } = require("./socket");

const path = require("path");
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const configuredOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  ...configuredOrigins,
]);

app.locals.allowedOrigins = allowedOrigins;
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests. Please try again later." },
  })
);
app.use(express.json({ limit: "6mb" }));
app.use(express.urlencoded({ extended: true, limit: "6mb" }));
app.use(cookieParser());
app.use(csrfProtection);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "online",
    message: "AI Study Buddy API Server is healthy and running.",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/user", require("./routes/authRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/notes", require("./routes/noteRoutes"));
app.use("/api/tasks", require("./routes/taskRoutes"));
app.use("/api/courses", require("./routes/courseRoutes"));
app.use("/api/timer", require("./routes/timerRoutes"));
app.use("/api/quiz", require("./routes/quizRoutes"));
app.use("/api/ai", require("./routes/aiRoutes"));
app.use("/api/pdf", require("./routes/pdfRoutes"));
app.use("/api/settings", require("./routes/settingsRoutes"));
app.use("/api/flashcards", require("./routes/flashcardRoutes"));
app.use("/api/roadmaps", require("./routes/roadmapRoutes"));

app.use((req, res) => {
  res.status(404).json({ success: false, message: "API route not found." });
});
app.use(errorHandler);

const server = http.createServer(app);
const io = initializeSocket(server, allowedOrigins);

if (require.main === module) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters.");
  }
  if (process.env.OTP_SECRET && process.env.OTP_SECRET.length < 32) {
    throw new Error("OTP_SECRET must contain at least 32 characters when configured.");
  }

  connectDB()
    .then(() => {
      const port = process.env.PORT || 5000;
      server.listen(port, () => {
        console.log(`[Study Buddy]: Server listening on port ${port}.`);
      });
    })
    .catch((error) => {
      console.error("[Study Buddy]: Database connection failed.");
      process.exitCode = 1;
    });
}

module.exports = app;
module.exports.server = server;
module.exports.io = io;
module.exports.allowedOrigins = allowedOrigins;
