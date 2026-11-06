import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { authAPI } from "../services/api";
import "../index.css";

function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Google Modal States
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    if (fullName.trim().length < 3) {
      setError("Full name must contain at least 3 characters.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (
      password.length < 8 ||
      password.length > 128 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      setError(
        "Password must contain 8 characters, uppercase, lowercase and a number."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Password and Confirm Password do not match.");
      return;
    }

    setLoading(true);
    
    try {
      const res = await authAPI.register({
        name: fullName.trim(),
        email: email.trim(),
        password,
      });

      if (!res.success) {
        setError(res.error || "Registration failed");
        return;
      }
      navigate("/verify-otp", {
        state: { email: email.trim(), fullName: fullName.trim() },
      });
    } catch {
      setError("Unable to create your account right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async (credentialResponse) => {
    if (!credentialResponse?.credential) {
      setError("Google authentication failed. Please try again.");
      return;
    }
    try {
      const res = await authAPI.googleLogin(credentialResponse.credential);
      if (res.success) {
        navigate("/dashboard");
        return;
      }
      setError(res.error || "Google authentication failed.");
    } catch {
      setError("Unable to sign up with Google right now.");
    } finally {
      setShowGoogleModal(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left Side */}
      <div className="auth-left">
        <div className="auth-brand">
          <span className="brand-icon">U</span>
          <span>AI Study Buddy</span>
        </div>

        <div className="auth-content">
          <h1>Join Thousands of Learners</h1>
          <p>
            Create your account and unlock your smart study space.
            Learn faster, practice better, and achieve your dreams.
          </p>
        </div>

        <div className="auth-footer">
          Start your learning journey today.
        </div>
      </div>

      {/* Right Side */}
      <div className="auth-right">
        <div className="auth-top">
          <Link to="/" className="back-link">
            ← Go to Website
          </Link>

          <div className="register-link">
            Already have an account?
            <Link to="/login"> Sign In</Link>
          </div>
        </div>

        <div className="login-form-wrapper">
          <h2>Create Your Account</h2>
          <p className="login-subtitle">
            Sign up to get started with AI Study Buddy.
          </p>

          <button
            type="button"
            className="google-login"
            onClick={() => setShowGoogleModal(true)}
          >
            <span>G</span> Sign up with Google
          </button>

          <div className="or-divider">
            <span>or</span>
          </div>

          <form onSubmit={handleSignup}>
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            {error && (
              <p className="form-error">{error}</p>
            )}

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? "Sending OTP..." : "OTP Verification"}
            </button>
          </form>

          <p className="signup-terms">
            By creating an account, you agree to our
            <span> Terms & Conditions</span>.
          </p>
        </div>
      </div>

      {/* Interactive Google Sign-In Dialog */}
      {showGoogleModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setShowGoogleModal(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "30px",
              width: "100%",
              maxWidth: "400px",
              boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                margin: "0 auto 15px",
                borderRadius: "50%",
                background: "#f0f4ff",
                display: "grid",
                placeItems: "center",
                fontSize: "24px",
                fontWeight: "bold",
                color: "#4285f4",
              }}
            >
              G
            </div>

            <h3 style={{ margin: "0 0 8px", fontSize: "20px", color: "#1f2937" }}>
              Sign up with Google
            </h3>
            <p style={{ margin: "0 0 20px", fontSize: "14px", color: "#6b7280" }}>
              Choose an account to continue to AI Study Buddy
            </p>

            <div style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}>
              {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
                <GoogleLogin
                  onSuccess={handleGoogleSignIn}
                  onError={() => setError("Google authentication failed.")}
                  text="signup_with"
                  shape="rectangular"
                />
              ) : (
                <p style={{ color: "#6b7280", fontSize: "14px" }}>
                  Google sign-in is not configured.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowGoogleModal(false)}
              style={{
                background: "none",
                border: "none",
                color: "#6b7280",
                fontSize: "14px",
                marginTop: "15px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Signup;
