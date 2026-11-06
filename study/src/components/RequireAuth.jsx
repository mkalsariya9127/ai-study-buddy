import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { authAPI } from "../services/api";
import { SocketProvider } from "../context/SocketContext";

function RequireAuth() {
  const [status, setStatus] = useState("checking");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const checkSession = async () => {
      const result = await authAPI.getProfile();
      if (!active) return;
      if (result.success) {
        setStatus("authenticated");
      } else if (result.networkError) {
        setStatus("unavailable");
      } else {
        setStatus("unauthenticated");
      }
    };

    checkSession();
    return () => {
      active = false;
    };
  }, [attempt]);

  useEffect(() => {
    const handleUnauthorized = () => setStatus("unauthenticated");
    window.addEventListener("studyBuddy:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("studyBuddy:unauthorized", handleUnauthorized);
  }, []);

  if (status === "checking") return <p role="status">Checking your session...</p>;
  if (status === "unavailable") {
    return (
      <main style={{ padding: 32, textAlign: "center" }}>
        <p>We could not verify your session. Check your connection and try again.</p>
      <button
        type="button"
        onClick={() => {
          setStatus("checking");
          setAttempt((value) => value + 1);
        }}
      >
          Retry
        </button>
      </main>
    );
  }
  if (status === "unauthenticated") return <Navigate to="/login" replace />;

  return (
    <SocketProvider>
      <Outlet />
    </SocketProvider>
  );
}

export default RequireAuth;
