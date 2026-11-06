import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { authAPI } from "../services/api";
import "../index.css";

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Google Modal States
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailPattern.test(email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const res = await authAPI.login({ email, password });

      if (res.success) {
        navigate("/dashboard");
        return;
      }
      setErrors({ general: res.error || "Invalid credentials" });
    } catch {
      setErrors({ general: "Unable to sign in right now. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async (credentialResponse) => {
    if (!credentialResponse?.credential) {
      setErrors({ general: "Google authentication failed. Please try again." });
      return;
    }
    try {
      const res = await authAPI.googleLogin(credentialResponse.credential);
      if (res.success) {
        navigate("/dashboard");
        return;
      }
      setErrors({ general: res.error || "Google authentication failed." });
    } catch {
      setErrors({ general: "Unable to sign in with Google right now." });
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
          <h1>Learn Smarter,<br />Achieve Bigger</h1>
          <p>
            Build your skills, achieve your goals,
            and take the next step in your learning journey.
          </p>
        </div>

        <div className="auth-footer">
          Your journey to success starts here.
        </div>
      </div>

      {/* Right Side */}
      <div className="auth-right">
        <div className="auth-top">
          <Link to="/" className="back-link">
            ← Go to Website
          </Link>

          <div className="register-link">
            Don't have an account?
            <Link to="/signup"> Register</Link>
          </div>
        </div>

        <div className="login-form-wrapper">
          <h2>Sign In to Your Account</h2>

          <p className="login-subtitle">
            Access your dashboard and continue your learning journey.
          </p>

          <button
            type="button"
            className="google-login"
            onClick={() => setShowGoogleModal(true)}
          >
            <span>G</span> Login with Google
          </button>

          <div className="or-divider">
            <span>or</span>
          </div>

          {errors.general && (
            <p className="form-error" style={{ marginBottom: "15px", textAlign: "center" }}>
              {errors.general}
            </p>
          )}

          <form onSubmit={handleLogin} noValidate>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors((prev) => ({ ...prev, email: "", general: "" }));
              }}
              autoComplete="email"
            />

            {errors.email && (
              <p className="form-error">{errors.email}</p>
            )}

            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, password: "", general: "" }));
                }}
                autoComplete="current-password"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {errors.password && (
              <p className="form-error">{errors.password}</p>
            )}

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? "Signing in..." : "Login"}
            </button>
          </form>

          <Link to="/forgot-password" className="forgot-link">
            Forgot Password?
          </Link>
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
              Sign in with Google
            </h3>
            <p style={{ margin: "0 0 20px", fontSize: "14px", color: "#6b7280" }}>
              Choose an account to continue to AI Study Buddy
            </p>

            <div style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}>
              {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
                <GoogleLogin
                  onSuccess={handleGoogleSignIn}
                  onError={() => setErrors({ general: "Google authentication failed." })}
                  text="signin_with"
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

export default Login;
