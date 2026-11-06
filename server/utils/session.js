const jwt = require("jsonwebtoken");

const SESSION_COOKIE = "studyBuddySession";
const REFRESH_COOKIE = "studyBuddyRefresh";
const CSRF_COOKIE = "studyBuddyCsrf";
const SESSION_TTL_MS = 15 * 60 * 1000;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === "production" ? "none" : "lax"),
  path: "/",
});

const csrfCookieOptions = () => ({
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === "production" ? "none" : "lax"),
  path: "/",
});

const createSessionToken = (user) =>
  jwt.sign(
    { id: user._id.toString(), tokenVersion: user.tokenVersion || 0, tokenUse: "access" },
    process.env.JWT_SECRET,
    { expiresIn: "15m", issuer: "ai-study-buddy", audience: "ai-study-buddy-client" }
  );

const createRefreshToken = (user) =>
  jwt.sign(
    { id: user._id.toString(), tokenVersion: user.tokenVersion || 0, tokenUse: "refresh" },
    process.env.JWT_SECRET,
    { expiresIn: "7d", issuer: "ai-study-buddy", audience: "ai-study-buddy-client" }
  );

const setSessionCookie = (res, user) => {
  res.cookie(SESSION_COOKIE, createSessionToken(user), {
    ...cookieOptions(),
    maxAge: SESSION_TTL_MS,
  });
  res.cookie(REFRESH_COOKIE, createRefreshToken(user), {
    ...cookieOptions(),
    maxAge: REFRESH_TTL_MS,
  });
};

const clearSessionCookie = (res) => {
  res.clearCookie(SESSION_COOKIE, cookieOptions());
  res.clearCookie(REFRESH_COOKIE, cookieOptions());
};

const clearCsrfCookie = (res) => {
  res.clearCookie(CSRF_COOKIE, csrfCookieOptions());
};

module.exports = {
  CSRF_COOKIE,
  REFRESH_COOKIE,
  SESSION_COOKIE,
  clearCsrfCookie,
  clearSessionCookie,
  cookieOptions,
  createSessionToken,
  createRefreshToken,
  csrfCookieOptions,
  setSessionCookie,
};
