import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import "./BackButton.css";

function BackButton() {
  const navigate = useNavigate();

  return (
    <button
      className="back-dashboard-btn"
      onClick={() => navigate("/dashboard")}
    >
      <ArrowLeft size={18} />
      Back to Dashboard
    </button>
  );
}

export default BackButton;