const crypto = require("crypto");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const { disconnectUserSockets } = require("../socket");
const {
  compareOtp,
  createOtp,
  hashOtp,
  isStrongPassword,
  isValidEmail,
  normalizeEmail,
} = require("../utils/authSecurity");
const {
  clearCsrfCookie,
  clearSessionCookie,
  csrfCookieOptions,
  setSessionCookie,
} = require("../utils/session");

const OTP_TTL_MS = 10 * 60 * 1000;
const RESET_OTP_TTL_MS = 15 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_SENDS_PER_HOUR = 5;
const OTP_MAX_ATTEMPTS = 5;
const GENERIC_RESET_MESSAGE =
  "If an account exists for that email, password reset instructions will be sent.";

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  course: user.course,
  college: user.college,
  bio: user.bio,
  photo: user.photo,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  xpPoints: user.xpPoints || 0,
  level: user.level || 1,
  badges: user.badges || ["Novice Scholar 🎓"],
});

const validateCredentials = (email, password) =>
  isValidEmail(email) && typeof password === "string" && password.length > 0;

const sendVerificationOtp = async (user) => {
  const otp = createOtp();
  const now = new Date();
  const windowStartedAt =
    user.otpWindowStartedAt && now - user.otpWindowStartedAt < 60 * 60 * 1000
      ? user.otpWindowStartedAt
      : now;
  const sendsInWindow =
    windowStartedAt === user.otpWindowStartedAt ? user.otpSendCount || 0 : 0;

  if (
    user.otpLastSentAt &&
    now - user.otpLastSentAt < OTP_RESEND_COOLDOWN_MS
  ) {
    return { cooldown: true };
  }
  if (sendsInWindow >= OTP_MAX_SENDS_PER_HOUR) {
    return { limitReached: true };
  }

  user.otpHash = hashOtp(user.email, "verify", otp);
  user.otpExpiresAt = new Date(now.getTime() + OTP_TTL_MS);
  user.otpAttempts = 0;
  user.otpLastSentAt = now;
  user.otpWindowStartedAt = windowStartedAt;
  user.otpSendCount = sendsInWindow + 1;
  user.otp = null;
  user.otpExpires = null;
  await user.save();

  try {
    await sendEmail({
      email: user.email,
      subject: "Verify Your Email - AI Study Buddy",
      otp,
      message: `Welcome ${user.name}! Enter this code to verify your email address:`,
    });
  } catch (error) {
    user.otpHash = null;
    user.otpExpiresAt = null;
    await user.save();
    throw error;
  }
  return { sent: true };
};

const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};
    if (
      typeof name !== "string" ||
      name.trim().length < 3 ||
      name.trim().length > 100 ||
      !validateCredentials(email, password)
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid name, email, and password.",
      });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must be 8-128 characters and include uppercase, lowercase, and a number.",
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const existing = await User.findOne({ email: normalizedEmail }).select(
      "+otpHash +otpExpiresAt +otpAttempts +otpLastSentAt +otpWindowStartedAt +otpSendCount"
    );
    if (existing?.isVerified) {
      return res.status(409).json({ success: false, message: "An account with this email already exists." });
    }

    if (existing) {
      const resent = await sendVerificationOtp(existing);
      if (resent.cooldown || resent.limitReached) {
        return res.status(429).json({
          success: false,
          message: "Please wait before requesting another verification code.",
        });
      }
      return res.status(200).json({
        success: true,
        message: "Verification code sent. Check your email.",
        data: { userId: existing._id, email: existing.email, name: existing.name },
      });
    }

    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password,
      isVerified: false,
    });

    try {
      await sendVerificationOtp(user);
    } catch {
      await User.deleteOne({ _id: user._id });
      console.error("[Auth]: Verification email delivery failed.");
      return res.status(503).json({
        success: false,
        message: "Could not send the verification email. Please try again later.",
      });
    }

    res.status(201).json({
      success: true,
      message: "Verification code sent. Check your email.",
      data: { userId: user._id, email: user.email, name: user.name },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }
    next(error);
  }
};

const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body || {};
    if (!isValidEmail(email) || typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, message: "Invalid or expired verification code." });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({
      email: normalizedEmail,
      isVerified: false,
      otpExpiresAt: { $gt: new Date() },
      otpAttempts: { $lt: OTP_MAX_ATTEMPTS },
    }).select("+otpHash +otpAttempts");

    if (!user || !compareOtp(normalizedEmail, "verify", otp, user.otpHash)) {
      if (user) {
        await User.updateOne(
          {
            _id: user._id,
            isVerified: false,
            otpExpiresAt: { $gt: new Date() },
            otpAttempts: { $lt: OTP_MAX_ATTEMPTS },
          },
          { $inc: { otpAttempts: 1 } }
        );
      }
      return res.status(400).json({ success: false, message: "Invalid or expired verification code." });
    }

    const verified = await User.findOneAndUpdate(
      {
        _id: user._id,
        isVerified: false,
        otpHash: user.otpHash,
        otpExpiresAt: { $gt: new Date() },
        otpAttempts: { $lt: OTP_MAX_ATTEMPTS },
      },
      {
        $set: { isVerified: true, lastLoginAt: new Date() },
        $unset: {
          otpHash: "",
          otpExpiresAt: "",
          otp: "",
          otpExpires: "",
          otpLastSentAt: "",
        },
      },
      { new: true }
    );

    if (!verified) {
      return res.status(400).json({ success: false, message: "Invalid or expired verification code." });
    }

    setSessionCookie(res, verified);
    res.status(200).json({
      success: true,
      message: "Email verified successfully.",
      user: publicUser(verified),
    });
  } catch (error) {
    next(error);
  }
};

const resendOTP = async (req, res, next) => {
  try {
    const email = req.body?.email;
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "Enter a valid email address." });
    }

    const user = await User.findOne({ email: normalizeEmail(email), isVerified: false })
      .select("+otpHash +otpExpiresAt +otpAttempts +otpLastSentAt +otpWindowStartedAt +otpSendCount");
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If the account is awaiting verification, a new code will be sent.",
      });
    }

    const result = await sendVerificationOtp(user);
    if (result.cooldown) {
      return res.status(429).json({
        success: false,
        message: "Please wait before requesting another verification code.",
        retryAfterSeconds: Math.ceil(
          (OTP_RESEND_COOLDOWN_MS - (Date.now() - user.otpLastSentAt.getTime())) / 1000
        ),
      });
    }
    if (result.limitReached) {
      return res.status(429).json({
        success: false,
        message: "Verification code resend limit reached. Try again later.",
      });
    }

    res.status(200).json({
      success: true,
      message: "If the account is awaiting verification, a new code will be sent.",
    });
  } catch (error) {
    console.error("[Auth]: Verification email delivery failed.");
    if (error.code === "SMTP_NOT_CONFIGURED" || error.code === "EMAIL_DELIVERY_FAILED") {
      return res.status(503).json({
        success: false,
        message: "Could not send the verification email. Please try again later.",
      });
    }
    next(error);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!validateCredentials(email, password)) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid email and password.",
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail })
      .select("+password +failedLoginAttempts +lockUntil");
    if (!user || !user.isVerified) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    const now = new Date();
    if (user.lockUntil && user.lockUntil > now) {
      return res.status(429).json({ success: false, message: "Too many failed attempts. Try again later." });
    }

    if (!(await user.matchPassword(password))) {
      const failedUser = await User.findByIdAndUpdate(
        user._id,
        { $inc: { failedLoginAttempts: 1 } },
        { new: true }
      ).select("+failedLoginAttempts");
      if (failedUser.failedLoginAttempts >= 5) {
        const delay = Math.min(
          15 * 60 * 1000,
          60 * 1000 * 2 ** Math.floor((failedUser.failedLoginAttempts - 5) / 2)
        );
        await User.updateOne(
          { _id: user._id },
          { $set: { lockUntil: new Date(now.getTime() + delay) } }
        );
      }
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLoginAt = new Date();
    await user.save();
    setSessionCookie(res, user);
    res.status(200).json({
      success: true,
      message: "Login successful.",
      user: publicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const email = req.body?.email;
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "Enter a valid email address." });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail })
      .select("+resetOtpLastSentAt");
    if (user && (!user.resetOtpLastSentAt || Date.now() - user.resetOtpLastSentAt.getTime() >= OTP_RESEND_COOLDOWN_MS)) {
      const resetOtp = createOtp();
      user.resetOtpHash = hashOtp(normalizedEmail, "reset", resetOtp);
      user.resetOtpExpiresAt = new Date(Date.now() + RESET_OTP_TTL_MS);
      user.resetOtpAttempts = 0;
      user.resetOtpLastSentAt = new Date();
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();

      try {
        await sendEmail({
          email: user.email,
          subject: "Reset Your Password - AI Study Buddy",
          otp: resetOtp,
          message: "Enter this code to reset your password:",
        });
      } catch {
        user.resetOtpHash = null;
        user.resetOtpExpiresAt = null;
        await user.save();
        console.error("[Auth]: Password reset email delivery failed.");
      }
    }

    res.status(200).json({ success: true, message: GENERIC_RESET_MESSAGE });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { email, resetToken, newPassword } = req.body || {};
    if (!isValidEmail(email) || typeof resetToken !== "string" || !/^\d{6}$/.test(resetToken)) {
      return res.status(400).json({ success: false, message: "Invalid or expired reset code." });
    }
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "Password must be 8-128 characters and include uppercase, lowercase, and a number.",
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail })
      .select("+resetOtpHash +resetOtpExpiresAt +resetOtpAttempts");
    const now = new Date();
    const valid =
      user &&
      user.resetOtpExpiresAt > now &&
      user.resetOtpAttempts < OTP_MAX_ATTEMPTS &&
      compareOtp(normalizedEmail, "reset", resetToken, user.resetOtpHash);

    if (!valid) {
      if (user && user.resetOtpExpiresAt > now && user.resetOtpAttempts < OTP_MAX_ATTEMPTS) {
        await User.updateOne(
          {
            _id: user._id,
            resetOtpExpiresAt: { $gt: now },
            resetOtpAttempts: { $lt: OTP_MAX_ATTEMPTS },
          },
          { $inc: { resetOtpAttempts: 1 } }
        );
      }
      return res.status(400).json({ success: false, message: "Invalid or expired reset code." });
    }

    const updated = await User.findOneAndUpdate(
      {
        _id: user._id,
        resetOtpHash: user.resetOtpHash,
        resetOtpExpiresAt: { $gt: now },
        resetOtpAttempts: { $lt: OTP_MAX_ATTEMPTS },
      },
      {
        $set: {
          resetOtpHash: null,
          resetOtpExpiresAt: null,
          resetOtpAttempts: 0,
          resetPasswordToken: null,
          resetPasswordExpires: null,
        },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(400).json({ success: false, message: "Invalid or expired reset code." });
    }

    updated.password = newPassword;
    updated.tokenVersion = (user.tokenVersion || 0) + 1;
    updated.failedLoginAttempts = 0;
    updated.lockUntil = null;
    await updated.save();
    disconnectUserSockets(updated._id);
    clearSessionCookie(res);
    clearCsrfCookie(res);
    res.status(200).json({
      success: true,
      message: "Password reset successful. Please sign in with your new password.",
    });
  } catch (error) {
    next(error);
  }
};

const googleAuth = async (req, res, next) => {
  try {
    const credential = req.body?.credential;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (typeof credential !== "string" || !clientId) {
      return res.status(401).json({ success: false, message: "Google authentication failed." });
    }

    const { OAuth2Client } = require("google-auth-library");
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      return res.status(401).json({ success: false, message: "Google authentication failed." });
    }

    const email = normalizeEmail(payload.email);
    let user = await User.findOne({ googleId: payload.sub });
    if (!user) user = await User.findOne({ email });

    if (user) {
      if (user.googleId && user.googleId !== payload.sub) {
        return res.status(409).json({
          success: false,
          message: "This account is linked to a different Google identity.",
        });
      }
      user.googleId = payload.sub;
      user.isVerified = true;
      if (!user.photo && payload.picture) user.photo = payload.picture;
      await user.save();
    } else {
      user = await User.create({
        name: (payload.name || email.split("@")[0]).slice(0, 100),
        email,
        photo: payload.picture || "",
        googleId: payload.sub,
        isVerified: true,
      });
    }

    setSessionCookie(res, user);
    res.status(200).json({
      success: true,
      message: "Google login successful.",
      user: publicUser(user),
    });
  } catch (error) {
    if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Google authentication failed." });
    }
    if (error.message?.includes("audience") || error.message?.includes("token")) {
      return res.status(401).json({ success: false, message: "Google authentication failed." });
    }
    next(error);
  }
};

const issueCsrfToken = (req, res) => {
  const csrfToken = crypto.randomBytes(32).toString("hex");
  res.cookie("studyBuddyCsrf", csrfToken, {
    ...csrfCookieOptions(),
    maxAge: 24 * 60 * 60 * 1000,
  });
  res.status(200).json({ success: true, csrfToken });
};

const getUserProfile = async (req, res) => {
  res.status(200).json({ success: true, user: publicUser(req.user) });
};

const updateUserProfile = async (req, res, next) => {
  try {
    const { name, phone, course, college, bio, photo } = req.body || {};
    const fields = { name, phone, course, college, bio, photo };
    for (const [field, value] of Object.entries(fields)) {
      if (value !== undefined && typeof value !== "string") {
        return res.status(400).json({ success: false, message: `Invalid ${field} value.` });
      }
      if (typeof value === "string" && value.length > (field === "photo" ? 4 * 1024 * 1024 : 500)) {
        return res.status(400).json({ success: false, message: `${field} is too long.` });
      }
    }
    if (name !== undefined && name.trim().length < 3) {
      return res.status(400).json({ success: false, message: "Name must contain at least 3 characters." });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    for (const [field, value] of Object.entries(fields)) {
      if (value !== undefined) user[field] = field === "name" ? value.trim() : value;
    }
    await user.save();
    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: publicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

const logoutUser = async (req, res, next) => {
  try {
    req.user.tokenVersion = (req.user.tokenVersion || 0) + 1;
    await req.user.save();
    disconnectUserSockets(req.user._id);
    clearSessionCookie(res);
    clearCsrfCookie(res);
    res.status(200).json({ success: true, message: "Logged out successfully." });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  forgotPassword,
  getUserProfile,
  googleAuth,
  issueCsrfToken,
  loginUser,
  logoutUser,
  registerUser,
  resendOTP,
  resetPassword,
  updateUserProfile,
  verifyOTP,
};
