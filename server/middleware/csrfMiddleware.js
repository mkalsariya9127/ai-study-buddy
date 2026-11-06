const crypto = require("crypto");
const { CSRF_COOKIE } = require("../utils/session");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const csrfProtection = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get("origin");
  if (origin && !req.app.locals.allowedOrigins.has(origin)) {
    return res.status(403).json({ success: false, message: "Request origin is not allowed" });
  }

  if (!req.cookies?.studyBuddySession && req.get("authorization")?.startsWith("Bearer ")) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get("x-csrf-token");
  if (
    typeof cookieToken !== "string" ||
    typeof headerToken !== "string" ||
    cookieToken.length !== headerToken.length ||
    !crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))
  ) {
    return res.status(403).json({ success: false, message: "CSRF validation failed" });
  }

  next();
};

module.exports = csrfProtection;
