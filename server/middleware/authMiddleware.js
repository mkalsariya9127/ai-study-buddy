const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { REFRESH_COOKIE, SESSION_COOKIE, setSessionCookie } = require("../utils/session");

const resolveUser = async (token, tokenUse = "access") => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET, {
    issuer: "ai-study-buddy",
    audience: "ai-study-buddy-client",
  });
  if (decoded.tokenUse !== tokenUse) return null;
  const user = await User.findById(decoded.id);
  if (
    !user ||
    !user.isVerified ||
    decoded.tokenVersion !== (user.tokenVersion || 0)
  ) {
    return null;
  }
  return user;
};

const protect = async (req, res, next) => {
  const bearer = req.get("authorization");
  const token =
    req.cookies?.[SESSION_COOKIE] ||
    (bearer?.startsWith("Bearer ") ? bearer.slice(7).trim() : null);
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  try {
    let user;
    let refreshed = false;
    if (token) {
      try {
        user = await resolveUser(token);
      } catch (error) {
        if (error.name !== "TokenExpiredError" || !refreshToken || bearer) throw error;
        user = await resolveUser(refreshToken, "refresh");
        refreshed = Boolean(user);
      }
    } else if (refreshToken) {
      user = await resolveUser(refreshToken, "refresh");
      refreshed = Boolean(user);
    }

    if (!user) {
      return res.status(401).json({ success: false, message: "Session is invalid or expired." });
    }
    if (refreshed) setSessionCookie(res, user);
    req.user = user;
    next();
  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(401).json({ success: false, message: "Session is invalid or expired." });
    }
    return next(error);
  }
};

module.exports = { protect, resolveUser };
