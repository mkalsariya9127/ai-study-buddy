const { Server } = require("socket.io");
const cookieParser = require("cookie-parser");
const { resolveUser } = require("./middleware/authMiddleware");
const { REFRESH_COOKIE, SESSION_COOKIE } = require("./utils/session");

let io;

const initializeSocket = (httpServer, allowedOrigins) => {
  io = new Server(httpServer, {
    cors: {
      origin: [...allowedOrigins],
      credentials: true,
    },
  });

  io.engine.use(cookieParser());
  io.use(async (socket, next) => {
    try {
      const origin = socket.handshake.headers.origin;
      if (origin && !allowedOrigins.has(origin)) {
        return next(new Error("Origin is not allowed."));
      }
      const cookies = socket.request.cookies || {};
      let user = null;
      if (cookies[REFRESH_COOKIE]) {
        try {
          user = await resolveUser(cookies[REFRESH_COOKIE], "refresh");
        } catch (error) {
          if (error.name !== "TokenExpiredError") throw error;
        }
      }
      if (!user && cookies[SESSION_COOKIE]) {
        user = await resolveUser(cookies[SESSION_COOKIE]);
      }
      if (!user) return next(new Error("Authentication required."));
      socket.data.userId = user._id.toString();
      next();
    } catch (error) {
      if (
        error.name === "TokenExpiredError" ||
        error.name === "JsonWebTokenError" ||
        error.name === "NotBeforeError"
      ) {
        return next(new Error("Authentication required."));
      }
      next(error);
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.data.userId}`);
  });

  return io;
};

const emitDashboardChanged = (userId) => {
  if (!io || !userId) return;
  io.to(`user:${userId.toString()}`).emit("dashboard:changed");
};

const disconnectUserSockets = (userId) => {
  if (!io || !userId) return;
  io.in(`user:${userId.toString()}`).disconnectSockets(true);
};

module.exports = { disconnectUserSockets, emitDashboardChanged, initializeSocket };
