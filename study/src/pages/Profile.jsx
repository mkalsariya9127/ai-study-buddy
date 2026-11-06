import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  BookOpen,
  Trophy,
  Clock,
  Pencil,
  Save,
  X,
  Camera,
  Trash2,
} from "lucide-react";
import "./Profile.css";
import BackButton from "../components/BackButton";
import { authAPI } from "../services/api";

const defaultProfile = {
  name: "Student Name",
  email: "student@example.com",
  phone: "9876543210",
  course: "BCA",
  college: "Your College Name",
  bio: "I am learning new skills and improving my knowledge.",
  photo: "",
};

function getSavedProfile() {
  try {
    const saved = localStorage.getItem("studyBuddyProfile");
    return saved ? { ...defaultProfile, ...JSON.parse(saved) } : defaultProfile;
  } catch (error) {
    console.error("Profile loading error:", error);
    return defaultProfile;
  }
}

function Profile() {
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState(getSavedProfile);
  const [savedProfile, setSavedProfile] = useState(getSavedProfile);

  useEffect(() => {
    const loadProfile = () => {
      const latest = getSavedProfile();
      setProfile(latest);
      setSavedProfile(latest);
    };

    const fetchBackendProfile = async () => {
      try {
        const res = await authAPI.getProfile();
        if (res.success && res.user) {
          const merged = { ...defaultProfile, ...res.user };
          setProfile(merged);
          setSavedProfile(merged);
          localStorage.setItem("studyBuddyProfile", JSON.stringify(merged));
        }
      } catch (err) {
        console.warn("Using local profile cache:", err);
      }
    };

    fetchBackendProfile();
    window.addEventListener("focus", loadProfile);
    return () => window.removeEventListener("focus", loadProfile);
  }, []);

  const updateField = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("Image size must be less than 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateField("photo", reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSave = async () => {
    try {
      const result = await authAPI.updateProfile(profile);
      if (!result.success) {
        alert(result.error || "Profile could not be saved.");
        return;
      }
      const updatedProfile = { ...defaultProfile, ...result.user };
      setProfile(updatedProfile);
      setSavedProfile(updatedProfile);
      setEditing(false);
      alert("Profile updated successfully!");
    } catch (error) {
      alert("Profile could not be saved. Please try again.");
      console.error("Profile save error:", error);
    }
  };

  const handleCancel = () => {
    setProfile(savedProfile);
    setEditing(false);
  };

  const handleRemovePhoto = () => {
    updateField("photo", "");
  };

  return (
    <div className="profile-page">
      <BackButton />
      <div className="profile-header">
        <div>
          <p className="profile-label">ACCOUNT</p>
          <h1>My Profile</h1>
          <p>Manage your personal information and learning journey.</p>
        </div>

        {!editing ? (
          <button className="profile-edit-btn" onClick={() => setEditing(true)}>
            <Pencil size={17} /> Edit Profile
          </button>
        ) : (
          <div className="profile-actions">
            <button className="profile-cancel-btn" onClick={handleCancel}>
              <X size={17} /> Cancel
            </button>
            <button className="profile-edit-btn" onClick={handleSave}>
              <Save size={17} /> Save
            </button>
          </div>
        )}
      </div>

      <div className="profile-layout">
        <div className="profile-card">
          <div className="profile-avatar">
            {profile.photo ? (
              <img src={profile.photo} alt="Profile" className="profile-photo" />
            ) : (
              <User size={55} />
            )}
          </div>

          {editing && (
            <div className="photo-actions">
              <label className="photo-upload-btn">
                <Camera size={15} /> Upload Photo
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handlePhotoUpload}
                />
              </label>

              {profile.photo && (
                <button
                  className="photo-remove-btn"
                  onClick={handleRemovePhoto}
                  type="button"
                >
                  <Trash2 size={15} /> Remove
                </button>
              )}
            </div>
          )}

          <h2>{profile.name}</h2>
          <p className="profile-role">Student</p>

          <div className="profile-divider" />

          <div className="profile-detail">
            <Mail size={18} />
            <span>{profile.email}</span>
          </div>

          <div className="profile-detail">
            <Phone size={18} />
            <span>{profile.phone}</span>
          </div>

          <div className="profile-detail">
            <GraduationCap size={18} />
            <span>{profile.course}</span>
          </div>
        </div>

        <div className="profile-main">
          <div className="profile-info-card">
            <h3>Personal Information</h3>

            <div className="profile-form-grid">
              <div className="profile-field">
                <label>Full Name</label>
                <input
                  value={profile.name}
                  disabled={!editing}
                  onChange={(e) => updateField("name", e.target.value)}
                />
              </div>

              <div className="profile-field">
                <label>Email Address</label>
                <input
                  value={profile.email}
                  disabled={!editing}
                  onChange={(e) => updateField("email", e.target.value)}
                />
              </div>

              <div className="profile-field">
                <label>Phone Number</label>
                <input
                  value={profile.phone}
                  disabled={!editing}
                  onChange={(e) => updateField("phone", e.target.value)}
                />
              </div>

              <div className="profile-field">
                <label>Course</label>
                <input
                  value={profile.course}
                  disabled={!editing}
                  onChange={(e) => updateField("course", e.target.value)}
                />
              </div>

              <div className="profile-field full-width">
                <label>College / University</label>
                <input
                  value={profile.college}
                  disabled={!editing}
                  onChange={(e) => updateField("college", e.target.value)}
                />
              </div>

              <div className="profile-field full-width">
                <label>About Me</label>
                <textarea
                  value={profile.bio}
                  disabled={!editing}
                  onChange={(e) => updateField("bio", e.target.value)}
                  rows="3"
                />
              </div>
            </div>
          </div>

          <div className="profile-info-card">
            <h3>Learning Overview</h3>

            <div className="profile-stats">
              <div className="profile-stat">
                <BookOpen size={25} />
                <strong>06</strong>
                <span>Enrolled Courses</span>
              </div>

              <div className="profile-stat">
                <Trophy size={25} />
                <strong>03</strong>
                <span>Completed Courses</span>
              </div>

              <div className="profile-stat">
                <Clock size={25} />
                <strong>24 hrs</strong>
                <span>Study Time</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
