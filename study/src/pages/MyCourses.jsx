
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  BookOpen,
  Clock3,
  Play,
  CheckCircle2,
  Code2,
  Brain,
  Database,
  Palette,
} from "lucide-react";
import "./MyCourses.css";
import { coursesAPI } from "../services/api";

const defaultCourses = [
  {
    id: "full-stack",
    title: "Full Stack Web Development",
    category: "Development",
    description: "Learn HTML, CSS, JavaScript, React and Node.js.",
    progress: 0,
    lessons: 32,
    completed: 0,
    duration: "12 weeks",
    iconType: "code",
    color: "blue",
  },
  {
    id: "python-prog",
    title: "Python Programming",
    category: "Programming",
    description: "Start Python from basics and build real projects.",
    progress: 0,
    lessons: 25,
    completed: 0,
    duration: "8 weeks",
    iconType: "brain",
    color: "purple",
  },
  {
    id: "database-mgmt",
    title: "Database Management",
    category: "Programming",
    description: "Understand SQL, databases and data management.",
    progress: 0,
    lessons: 20,
    completed: 0,
    duration: "6 weeks",
    iconType: "database",
    color: "green",
  },
  {
    id: "ui-ux-design",
    title: "UI/UX Design Basics",
    category: "Design",
    description: "Learn design principles and create user-friendly interfaces.",
    progress: 0,
    lessons: 15,
    completed: 0,
    duration: "5 weeks",
    iconType: "palette",
    color: "orange",
  },
];

const categories = ["All Courses", "Development", "Programming", "Design"];

const icons = {
  code: Code2,
  brain: Brain,
  database: Database,
  palette: Palette,
};

function getSavedCourses() {
  try {
    const saved = localStorage.getItem("studyBuddyCourses");

    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (error) {
    console.error("Error loading courses:", error);
  }

  return defaultCourses;
}

function MyCourses() {
  const [courses, setCourses] = useState(getSavedCourses);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Courses");

  useEffect(() => {
    localStorage.setItem("studyBuddyCourses", JSON.stringify(courses));
  }, [courses]);

  useEffect(() => {
    const fetchBackendCourses = async () => {
      try {
        const res = await coursesAPI.getAll();
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          const formatted = res.data.map((c) => ({
            id: c._id,
            _id: c._id,
            courseId: c.courseId,
            title: c.title,
            category: c.category || "Programming",
            description: c.description || "",
            progress: Number(c.progress) || 0,
            lessons: c.totalLessons || 20,
            completed: c.completedLessons || 0,
            duration: c.duration || "8 weeks",
            iconType: c.iconType || "code",
            color: c.color || "blue",
          }));
          setCourses(formatted);
          localStorage.setItem("studyBuddyCourses", JSON.stringify(formatted));
        }
      } catch (err) {
        console.warn("Using offline courses cache:", err);
      }
    };

    fetchBackendCourses();
  }, []);

  const completeNextLesson = async (courseId) => {
    try {
      const res = await coursesAPI.completeLesson(courseId, window.crypto.randomUUID());
      if (res && res.success && res.data) {
        setCourses((prev) =>
          prev.map((c) =>
            (c._id === courseId || c.id === courseId)
              ? {
                  ...c,
                  completed: res.data.completedLessons,
                  progress: res.data.progress,
                }
              : c
          )
        );
        window.dispatchEvent(new Event("storage"));
        return;
      }
      window.alert(res?.error || "Course progress could not be saved.");
    } catch {
      window.alert("Course progress could not be saved. Please try again.");
    }
  };

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(search.toLowerCase()) ||
      course.description.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      category === "All Courses" || course.category === category;

    return matchesSearch && matchesCategory;
  });

  const totalCompleted = courses.reduce(
    (total, course) => total + course.completed,
    0
  );

  const inProgress = courses.filter(
    (course) => course.progress < 100
  ).length;

  return (
    <div className="courses-page">
      <header className="courses-header">
        <Link to="/dashboard" className="courses-back">
          <ArrowLeft size={19} />
          Dashboard
        </Link>

        <div className="courses-header-title">
          <BookOpen size={21} />
          <span>My Courses</span>
        </div>
      </header>

      <main className="courses-container">
        <section className="courses-intro">
          <div>
            <span className="courses-eyebrow">YOUR LEARNING SPACE</span>
            <h1>My Courses</h1>
            <p>Keep learning, keep growing. Your progress starts here.</p>
          </div>

          <div className="courses-total">
            <BookOpen size={20} />
            <div>
              <strong>{courses.length}</strong>
              <span>Enrolled courses</span>
            </div>
          </div>
        </section>

        <section className="courses-stats">
          <div className="courses-stat-card">
            <span>Total Courses</span>
            <strong>{courses.length}</strong>
          </div>

          <div className="courses-stat-card">
            <span>Completed Lessons</span>
            <strong>{totalCompleted}</strong>
          </div>

          <div className="courses-stat-card">
            <span>In Progress</span>
            <strong>{inProgress}</strong>
          </div>
        </section>

        <section className="courses-toolbar">
          <div>
            <h2>Continue Learning</h2>
            <p>Choose a course and continue where you left off.</p>
          </div>

          <div className="courses-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search courses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </section>

        <nav className="courses-filters">
          {categories.map((item) => (
            <button
              key={item}
              className={category === item ? "active" : ""}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        <section className="courses-grid">
          {filteredCourses.length > 0 ? (
            filteredCourses.map((course) => {
              const Icon = icons[course.iconType] || BookOpen;

              return (
                <article className="course-card" key={course.id}>
                  <div className="course-card-top">
                    <div className={`course-icon ${course.color}`}>
                      <Icon size={25} />
                    </div>

                    <span className="course-category">
                      {course.category}
                    </span>
                  </div>

                  <h3>{course.title}</h3>
                  <p className="course-description">
                    {course.description}
                  </p>

                  <div className="course-progress-info">
                    <span>Your Progress</span>
                    <strong>{course.progress}%</strong>
                  </div>

                  <div className="course-progress-track">
                    <div
                      className="course-progress-fill"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>

                  <div className="course-meta">
                    <span>
                      <BookOpen size={15} />
                      {course.completed}/{course.lessons} lessons
                    </span>

                    <span>
                      <Clock3 size={15} />
                      {course.duration}
                    </span>
                  </div>

                  <button
                    className="course-continue-btn"
                    disabled={course.completed >= course.lessons}
                    onClick={() => completeNextLesson(course._id || course.id)}
                  >
                    {course.completed >= course.lessons ? (
                      <>
                        <CheckCircle2 size={17} />
                        Completed
                      </>
                    ) : (
                      <>
                        <Play size={16} />
                        Continue Learning
                      </>
                    )}
                  </button>
                </article>
              );
            })
          ) : (
            <div className="courses-empty">
              <Search size={30} />
              <h3>No courses found</h3>
              <p>Try another search or select a different category.</p>

              <button
                onClick={() => {
                  setSearch("");
                  setCategory("All Courses");
                }}
              >
                Clear Filters
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default MyCourses;
