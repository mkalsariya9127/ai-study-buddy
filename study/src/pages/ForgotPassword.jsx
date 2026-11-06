import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";
import "../index.css";

function ForgotPassword() {
  const [step, setStep] = useState(1); // 1 = Enter Email, 2 = Enter Code & New Password, 3 = Success
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Step 1: Send Reset Code
  const handleSendCode = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Please enter a valid registered email address.");
      return;
    }

    setLoading(true);

    try {
      const res = await authAPI.forgotPassword(email.trim());

      if (res.success) {
        setStep(2);
      } else {
        setErrorMsg(res.error || "Unable to send reset instructions. Please try again.");
      }
    } catch {
      setErrorMsg("Unable to send reset instructions right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Submit New Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!resetToken.trim()) {
      setErrorMsg("Please enter the 6-digit reset security code.");
      return;
    }

    if (
      newPassword.length < 8 ||
      newPassword.length > 128 ||
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword)
    ) {
      setErrorMsg("Password must be 8-128 characters and include uppercase, lowercase and a number.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("New password and Confirm Password do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await authAPI.resetPassword({
        email: email.trim(),
        resetToken: resetToken.trim(),
        newPassword,
      });

      if (res.success) {
        setStep(3);
      } else {
        setErrorMsg(res.error || "Invalid or expired reset code.");
      }
    } catch {
      setErrorMsg("Unable to reset your password right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <span className="brand-icon">U</span>
          <span>AI Study Buddy</span>
        </div>
        <div className="auth-content">
          <h1>Account Recovery</h1>
          <p>
            Securely reset your password and get back to your learning journey without missing a beat.
          </p>
        </div>
        <div className="auth-footer">Need help? Support is always here.</div>
      </div>

      <div className="auth-right">
        <div className="auth-top">
          <Link to="/login" className="back-link">
            ← Back to Login
          </Link>
        </div>

        <div className="login-form-wrapper">
          {/* STEP 1: Enter Email */}
          {step === 1 && (
            <>
              <h2>Forgot Your Password?</h2>
              <p className="login-subtitle">
                Enter your registered email and we'll send you a password reset code.
              </p>

              {errorMsg && (
                <p className="form-error" style={{ marginBottom: "15px", textAlign: "center" }}>
                  {errorMsg}
                </p>
              )}

              <form onSubmit={handleSendCode}>
                <input
                  type="email"
                  placeholder="Enter your registered email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrorMsg("");
                  }}
                  required
                />
                <button
                  type="submit"
                  className="login-submit"
                  disabled={loading}
                  style={{ marginTop: "16px" }}
                >
                  {loading ? "Sending Code..." : "Send Reset Code"}
                </button>
              </form>
            </>
          )}

          {/* STEP 2: Enter Code & New Password */}
          {step === 2 && (
            <>
              <h2>Reset Your Password</h2>
              <p className="login-subtitle">
                We've sent a verification code to: <strong>{email}</strong>
              </p>

              {errorMsg && (
                <p className="form-error" style={{ marginBottom: "15px", textAlign: "center" }}>
                  {errorMsg}
                </p>
              )}

              <form onSubmit={handleResetPassword}>
                <input
                  type="text"
                  placeholder="Enter 6-digit Reset Code"
                  value={resetToken}
                  onChange={(e) => {
                    setResetToken(e.target.value);
                    setErrorMsg("");
                  }}
                  required
                  style={{ textAlign: "center", letterSpacing: "4px", fontSize: "16px" }}
                />

                <div className="password-field" style={{ marginTop: "14px" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter New Password (min 8 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  style={{ marginTop: "14px" }}
                />

                <button
                  type="submit"
                  className="login-submit"
                  disabled={loading}
                  style={{ marginTop: "16px" }}
                >
                  {loading ? "Updating..." : "Update Password"}
                </button>
              </form>

              <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "18px", textAlign: "center" }}>
                Didn't receive the email? Please check your Spam or Junk folder.
              </p>

              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#7047eb",
                  cursor: "pointer",
                  fontSize: "13px",
                  display: "block",
                  margin: "15px auto 0",
                }}
              >
                Change Email Address
              </button>
            </>
          )}

          {/* STEP 3: Success Screen */}
          {step === 3 && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div
                style={{
                  width: "55px",
                  height: "55px",
                  borderRadius: "50%",
                  background: "#e4f8eb",
                  color: "#20a45b",
                  fontSize: "32px",
                  margin: "0 auto 15px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✓
              </div>
              <h2 style={{ color: "#111827", marginBottom: "10px" }}>Password Updated!</h2>
              <p style={{ color: "#4b5563", fontSize: "14px", lineHeight: "1.6", marginBottom: "25px" }}>
                Your password has been successfully reset. You can now sign in to your account with your new password.
              </p>
              <button
                type="button"
                className="login-submit"
                onClick={() => navigate("/login")}
              >
                Sign In Now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
