const { UserCourse } = require("../models/Course");
const CourseCompletion = require("../models/CourseCompletion");
const { emitDashboardChanged } = require("../socket");

const initialUserCourses = [
  {
    courseId: "full-stack",
    title: "Full Stack Web Development",
    category: "Development",
    description: "Learn HTML, CSS, JavaScript, React and Node.js.",
    iconType: "code",
    color: "blue",
    totalLessons: 32,
    completedLessons: 0,
    progress: 0,
  },
  {
    courseId: "python-prog",
    title: "Python Programming",
    category: "Programming",
    description: "Start Python from basics and build real projects.",
    iconType: "brain",
    color: "purple",
    totalLessons: 25,
    completedLessons: 0,
    progress: 0,
  },
  {
    courseId: "database-mgmt",
    title: "Database Management",
    category: "Programming",
    description: "Understand SQL, databases and data management.",
    iconType: "database",
    color: "green",
    totalLessons: 20,
    completedLessons: 0,
    progress: 0,
  },
  {
    courseId: "ui-ux-design",
    title: "UI/UX Design Basics",
    category: "Design",
    description: "Learn design principles and create user-friendly interfaces.",
    iconType: "palette",
    color: "orange",
    totalLessons: 15,
    completedLessons: 0,
    progress: 0,
  },
];

// @desc    Get user's enrolled courses with progress (0% for new users)
// @route   GET /api/courses
const getUserCourses = async (req, res, next) => {
  try {
    const userId = req.user._id;
    let courses = await UserCourse.find({ user: userId });

    // Seed default courses starting at 0% for this user if not yet initialized
    if (courses.length === 0) {
      const seeded = initialUserCourses.map((c) => ({
        ...c,
        user: userId,
      }));
      courses = await UserCourse.insertMany(seeded);
    }

    res.status(200).json({ success: true, count: courses.length, data: courses });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete next lesson/topic in course
// @route   POST /api/courses/:id/lesson-complete
const completeLesson = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const course = await UserCourse.findOne({
      _id: req.params.id,
      user: userId,
    });

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const total = course.totalLessons || 20;
    const currentCompleted = course.completedLessons || 0;
    if (currentCompleted >= total) {
      return res.status(200).json({ success: true, message: "Course is already complete.", data: course });
    }

    const requestId = req.body?.requestId;
    if (typeof requestId !== "string" || !/^[A-Za-z0-9._:-]{20,100}$/.test(requestId)) {
      return res.status(400).json({ success: false, message: "A valid completion request ID is required." });
    }

    try {
      await CourseCompletion.create({ user: userId, course: course._id, requestId });
    } catch (error) {
      if (error.code !== 11000) throw error;
      const existingCourse = await UserCourse.findOne({ _id: course._id, user: userId });
      return res.status(200).json({ success: true, data: existingCourse, duplicate: true });
    }

    let updatedCourse;
    try {
      updatedCourse = await UserCourse.findOneAndUpdate(
        { _id: course._id, user: userId },
        [
          {
            $set: {
              completedLessons: {
                $min: [
                  { $add: [{ $ifNull: ["$completedLessons", 0] }, 1] },
                  { $ifNull: ["$totalLessons", 20] },
                ],
              },
            },
          },
          {
            $set: {
              progress: {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          "$completedLessons",
                          { $max: [1, { $ifNull: ["$totalLessons", 20] }] },
                        ],
                      },
                      100,
                    ],
                  },
                  0,
                ],
              },
            },
          },
        ],
        { new: true }
      );
      if (!updatedCourse) throw new Error("Course update failed.");
    } catch (error) {
      await CourseCompletion.deleteOne({ user: userId, course: course._id, requestId });
      throw error;
    }

    emitDashboardChanged(userId);
    res.status(200).json({
      success: true,
      message: "Lesson marked complete",
      data: updatedCourse,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update course progress directly
// @route   PUT /api/courses/:id/progress
const updateCourseProgress = async (req, res, next) => {
  try {
    const { progress } = req.body || {};
    if (typeof progress !== "number" || !Number.isFinite(progress) || progress < 0 || progress > 100) {
      return res.status(400).json({ success: false, message: "Progress must be a number from 0 to 100." });
    }
    const course = await UserCourse.findOne({ _id: req.params.id, user: req.user._id });

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    course.progress = progress;
    const total = course.totalLessons || 20;
    course.completedLessons = Math.round((progress / 100) * total);
    await course.save();

    emitDashboardChanged(req.user._id);
    res.status(200).json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserCourses,
  completeLesson,
  updateCourseProgress,
};
