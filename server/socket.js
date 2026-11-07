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
      socket.data.userName = user.name || "Student";
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
    // 1. Join user-private room for dashboard events
    socket.join(`user:${socket.data.userId}`);

    // 2. Join Virtual Group Study Room
    socket.on("room:join", ({ roomCode, userName }) => {
      if (roomCode && typeof roomCode === "string") {
        const cleanRoom = roomCode.toUpperCase().trim().slice(0, 15);
        socket.join(`group:${cleanRoom}`);
        socket.data.groupRoom = cleanRoom;
        if (userName) socket.data.userName = userName;

        io.to(`group:${cleanRoom}`).emit("room:user_joined", {
          userId: socket.data.userId,
          userName: socket.data.userName,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // 3. Leave Virtual Group Study Room
    socket.on("room:leave", () => {
      if (socket.data.groupRoom) {
        io.to(`group:${socket.data.groupRoom}`).emit("room:user_left", {
          userId: socket.data.userId,
          userName: socket.data.userName,
        });
        socket.leave(`group:${socket.data.groupRoom}`);
        socket.data.groupRoom = null;
      }
    });

    // 4. Group Timer Sync (Start / Pause / Reset)
    socket.on("room:timer_action", ({ action, secondsRemaining }) => {
      if (socket.data.groupRoom) {
        io.to(`group:${socket.data.groupRoom}`).emit("room:timer_update", {
          action,
          secondsRemaining,
          by: socket.data.userName,
        });
      }
    });

    // 5. Room Chat Message
    socket.on("room:message", ({ text }) => {
      if (socket.data.groupRoom && text && typeof text === "string") {
        io.to(`group:${socket.data.groupRoom}`).emit("room:new_message", {
          id: Date.now().toString() + "-" + Math.random().toString(36).substring(2, 6),
          userId: socket.data.userId,
          userName: socket.data.userName,
          text: text.trim().slice(0, 300),
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
      }
    });

    // 6. Announce Presence to Newly Joined Peer
    socket.on("room:announce_presence", ({ targetUserId }) => {
      if (socket.data.groupRoom && targetUserId) {
        io.to(`user:${targetUserId}`).emit("room:user_joined", {
          userId: socket.data.userId,
          userName: socket.data.userName,
          timestamp: new Date().toISOString(),
        });
      }
    });

    socket.on("disconnect", () => {
      if (socket.data.groupRoom) {
        io.to(`group:${socket.data.groupRoom}`).emit("room:user_left", {
          userId: socket.data.userId,
          userName: socket.data.userName,
        });
      }
    });
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
