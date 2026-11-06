import React, { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Save,
} from "lucide-react";
import "./Settings.css";
import BackButton from "../components/BackButton";
import { settingsAPI } from "../services/api";
import { getSavedTheme, applyTheme } from "../utils/theme";

function getInitialSettings() {
  const defaults = {
    name: "Student Name",
    email: "student@example.com",
    language: "English",
    theme: getSavedTheme(),
    emailNotifications: true,
    studyReminders: true,
    courseUpdates: false,
  };
  try {
    const savedProfile = localStorage.getItem("studyBuddyProfile");
    if (savedProfile) {
      const p = JSON.parse(savedProfile);
      return {
        ...defaults,
        name: p.name || defaults.name,
        email: p.email || defaults.email,
      };
    }
  } catch (e) {
    console.error(e);
  }
  return defaults;
}

function Settings() {
  const [settings, setSettings] = useState(getInitialSettings);

  useEffect(() => {

    const fetchSettings = async () => {
      try {
        const res = await settingsAPI.getSettings();
        if (res.success && res.settings) {
          setSettings((prev) => ({ ...prev, ...res.settings }));
        }
      } catch (err) {
        console.warn("Using offline settings cache:", err);
      }
    };

    fetchSettings();
  }, []);

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    if (key === "theme") {
      applyTheme(value);
    }
  };

  const handleSave = async () => {
    try {
      applyTheme(settings.theme);
      localStorage.setItem("studyBuddyProfile", JSON.stringify({
        ...JSON.parse(localStorage.getItem("studyBuddyProfile") || "{}"),
        name: settings.name,
        email: settings.email
      }));
      await settingsAPI.updateSettings(settings);
      alert("Settings saved successfully!");
    } catch (err) {
      alert("Settings saved locally!");
      console.warn("Offline settings save:", err);
    }
  };

  return (
    <div className="settings-page">
      <BackButton />
      <div className="settings-header">
        <div>
          <p className="settings-label">PREFERENCES</p>
          <h1>Settings</h1>
          <p>Customize your AI Study Buddy experience.</p>
        </div>
        <SettingsIcon size={35} className="settings-header-icon" />
      </div>

      <div className="settings-container">
        <section className="settings-card">
          <div className="settings-section-title">
            <User />
            <div>
              <h2>Account Settings</h2>
              <p>Manage your personal information.</p>
            </div>
          </div>

          <div className="settings-fields">
            <label>
              Full Name
              <input
                value={settings.name}
                onChange={(e) => updateSetting("name", e.target.value)}
              />
            </label>

            <label>
              Email Address
              <input
                type="email"
                value={settings.email}
                onChange={(e) => updateSetting("email", e.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-section-title">
            <Palette />
            <div>
              <h2>Appearance</h2>
              <p>Choose how your dashboard looks.</p>
            </div>
          </div>

          <div className="settings-row">
            <div>
              <strong>Theme</strong>
              <p>Select your preferred theme.</p>
            </div>

            <select
              value={settings.theme}
              onChange={(e) => updateSetting("theme", e.target.value)}
            >
              <option>Light</option>
              <option>Dark</option>
            </select>
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-section-title">
            <Bell />
            <div>
              <h2>Notifications</h2>
              <p>Control the notifications you receive.</p>
            </div>
          </div>

          {[
            ["emailNotifications", "Email Notifications", "Receive updates by email."],
            ["studyReminders", "Study Reminders", "Get reminders for your study plan."],
            ["courseUpdates", "Course Updates", "Receive new course announcements."],
          ].map(([key, title, description]) => (
            <div className="settings-row" key={key}>
              <div>
                <strong>{title}</strong>
                <p>{description}</p>
              </div>

              <label className="settings-switch">
                <input
                  type="checkbox"
                  checked={settings[key]}
                  onChange={(e) => updateSetting(key, e.target.checked)}
                />
                <span className="settings-slider" />
              </label>
            </div>
          ))}
        </section>

        <section className="settings-card">
          <div className="settings-section-title">
            <Globe />
            <div>
              <h2>Language</h2>
              <p>Choose your preferred language.</p>
            </div>
          </div>

          <div className="settings-row">
            <strong>Display Language</strong>

            <select
              value={settings.language}
              onChange={(e) => updateSetting("language", e.target.value)}
            >
              <option>English</option>
              <option>Gujarati</option>
              <option>Hindi</option>
            </select>
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-section-title">
            <Shield />
            <div>
              <h2>Privacy & Security</h2>
              <p>Keep your account secure.</p>
            </div>
          </div>

          <div className="settings-row">
            <div>
              <strong>Password</strong>
              <p>Change your account password.</p>
            </div>
            <button
              className="settings-secondary-btn"
              onClick={() => alert("Password reset link will be sent to your email.")}
            >
              Change Password
            </button>
          </div>
        </section>

        <div className="settings-save-area">
          <button className="settings-save-btn" onClick={handleSave}>
            <Save size={18} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
