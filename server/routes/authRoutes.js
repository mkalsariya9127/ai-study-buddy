const express = require("express");
const router = express.Router();
const {
  registerUser,
  verifyOTP,
  resendOTP,
  loginUser,
  forgotPassword,
  resetPassword,
  getUserProfile,
  updateUserProfile,
  googleAuth,
  issueCsrfToken,
  logoutUser,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const rateLimit = require("express-rate-limit");

const createLimiter = (windowMs, limit) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many attempts. Please try again later." },
  });

const loginLimiter = createLimiter(15 * 60 * 1000, 10);
const signupLimiter = createLimiter(60 * 60 * 1000, 10);
const otpLimiter = createLimiter(15 * 60 * 1000, 10);
const resendLimiter = createLimiter(60 * 60 * 1000, 5);
const resetLimiter = createLimiter(60 * 60 * 1000, 5);

router.get("/csrf", issueCsrfToken);
router.post("/register", signupLimiter, registerUser);
router.post("/verify-otp", otpLimiter, verifyOTP);
router.post("/resend-otp", resendLimiter, resendOTP);
router.post("/login", loginLimiter, loginUser);
router.post("/google", loginLimiter, googleAuth);
router.post("/forgot-password", resetLimiter, forgotPassword);
router.post("/reset-password", resetLimiter, resetPassword);
router.post("/logout", protect, logoutUser);

// Profile
router.route("/profile").get(protect, getUserProfile).put(protect, updateUserProfile);

module.exports = router;
