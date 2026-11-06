import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";

import RequireAuth from "./components/RequireAuth";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import AIAssistant from "./pages/AIAssistant";
import MyCourses from "./pages/MyCourses";
import StudyPlanner from "./pages/StudyPlanner";
import Notes from "./pages/Notes";
import Quiz from "./pages/Quiz";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import VerifyOTP from "./pages/VerifyOTP";
import PDFAnalyzer from "./pages/PDFAnalyzer";
import StudyTimer from "./pages/StudyTimer";

function App() {
  const routes = (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/ai-assistant" element={<AIAssistant />} />
          <Route path="/courses" element={<MyCourses />} />
          <Route path="/study-planner" element={<StudyPlanner />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/pdf-analyzer" element={<PDFAnalyzer />} />
          <Route path="/study-timer" element={<StudyTimer />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return googleClientId ? (
    <GoogleOAuthProvider clientId={googleClientId}>{routes}</GoogleOAuthProvider>
  ) : (
    routes
  );
}

export default App;
