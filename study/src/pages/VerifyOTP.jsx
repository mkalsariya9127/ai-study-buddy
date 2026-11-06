import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";

function VerifyOTP() {
  const [otp, setOtp] = useState("");
  const [verified, setVerified] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || "your registered email";
  const fullName = location.state?.fullName || "";

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = window.setTimeout(
      () => setResendCooldown((remaining) => Math.max(0, remaining - 1)),
      1000
    );
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);
  
  const handleVerify = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (otp.length !== 6) {
      setErrorMsg("Please enter a valid 6-digit OTP.");
      return;
    }

    setLoading(true);

    try {
      const res = await authAPI.verifyOTP({ email, otp });

      if (res.success) {
        setVerified(true);
      } else {
        setErrorMsg(res.error || "Invalid or expired OTP");
      }
    } catch {
      setErrorMsg("Unable to verify your email right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setErrorMsg("");
    setResendMessage("");
    const res = await authAPI.resendOTP(email);
    if (res.success) {
      setResendCooldown(60);
      setResendMessage(res.message);
    } else {
      setResendCooldown(res.retryAfterSeconds || 0);
      setErrorMsg(res.error || "Unable to resend the verification code.");
    }
  };

  const handleCreateAccount = () => {
    navigate("/dashboard");
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {!verified ? (
          <>
            <h1>Verify Your Email</h1>
            <p>Enter the 6-digit verification code sent to:</p>
            <strong>{email}</strong>

            <form onSubmit={handleVerify}>
              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                maxLength={6}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, ""));
                  setErrorMsg("");
                }}
                style={styles.input}
              />

              {errorMsg && (
                <p style={{ color: "#ef4444", fontSize: "14px", margin: "5px 0 10px" }}>
                  {errorMsg}
                </p>
              )}
              {resendMessage && (
                <p style={{ color: "#20a45b", fontSize: "14px", margin: "5px 0 10px" }}>
                  {resendMessage}
                </p>
              )}

              <button type="submit" style={styles.button} disabled={loading}>
                {loading ? "Verifying..." : "Verify OTP"}
              </button>
            </form>

            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || loading}
              style={{ ...styles.backButton, opacity: resendCooldown > 0 ? 0.6 : 1 }}
            >
              {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend verification code"}
            </button>

            <p style={styles.note}>
              Didn't receive the verification email? Please check your Spam or Junk folder.
            </p>
          </>
        ) : (
          <>
            <div style={styles.successIcon}>✓</div>
            <h1>Email Verified!</h1>
            <p>Your email verification is complete.</p>
            <strong>{fullName}</strong>

            <button
              onClick={handleCreateAccount}
              style={styles.button}
            >
              Go to Dashboard
            </button>
          </>
        )}

        <button
          onClick={() => navigate("/signup")}
          style={styles.backButton}
        >
          Back to Signup
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f4f1ff",
    padding: "20px",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: "#fff",
    padding: "35px",
    borderRadius: "16px",
    textAlign: "center",
    boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
  },
  input: {
    width: "100%",
    padding: "14px",
    marginTop: "25px",
    marginBottom: "15px",
    boxSizing: "border-box",
    border: "1px solid #ccc",
    borderRadius: "8px",
    fontSize: "18px",
    textAlign: "center",
    letterSpacing: "8px",
  },
  button: {
    width: "100%",
    padding: "14px",
    background: "#7047eb",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
    marginTop: "15px",
  },
  note: {
    fontSize: "13px",
    color: "#777",
    marginTop: "20px",
  },
  backButton: {
    background: "none",
    border: "none",
    color: "#7047eb",
    cursor: "pointer",
    marginTop: "20px",
  },
  successIcon: {
    width: "55px",
    height: "55px",
    borderRadius: "50%",
    background: "#e4f8eb",
    color: "#20a45b",
    fontSize: "35px",
    margin: "0 auto 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};

export default VerifyOTP;
