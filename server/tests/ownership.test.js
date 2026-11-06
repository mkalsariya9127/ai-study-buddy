const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const {
  clearTestDatabase,
  startTestDatabase,
  stopTestDatabase,
} = require("./testDatabase");
const app = require("../server");
const User = require("../models/User");
const Note = require("../models/Note");
const Task = require("../models/Task");
const { UserCourse } = require("../models/Course");
const StudySession = require("../models/StudySession");
const QuizAttempt = require("../models/Quiz");
const { getKolkataDateString } = require("../utils/dateTime");

const createUser = (email) =>
  User.create({
    name: "Study User",
    email,
    password: "StudyBuddyPass1",
    isVerified: true,
  });

const authHeader = (user) => ({
  Authorization: `Bearer ${jwt.sign(
    { id: user._id.toString(), tokenVersion: 0, tokenUse: "access" },
    process.env.JWT_SECRET,
    {
      expiresIn: "5m",
      issuer: "ai-study-buddy",
      audience: "ai-study-buddy-client",
    }
  )}`,
});

test.before(startTestDatabase);
test.beforeEach(clearTestDatabase);
test.after(stopTestDatabase);

test("private records and dashboard aggregates are scoped to the verified user", async () => {
  const accountA = await createUser("account-a@example.com");
  const accountB = await createUser("account-b@example.com");
  const authA = authHeader(accountA);
  const authB = authHeader(accountB);
  const [profileA, profileB] = await Promise.all([
    request(app).get("/api/user/profile").set(authA),
    request(app).get("/api/user/profile").set(authB),
  ]);
  assert.equal(profileA.body.user.id, accountA._id.toString());
  assert.equal(profileB.body.user.id, accountB._id.toString());

  const [noteA, taskA, courseA] = await Promise.all([
    Note.create({ user: accountA._id, title: "Private note", content: "Account A content" }),
    Task.create({
      user: accountA._id,
      title: "Private task",
      date: getKolkataDateString(),
      completed: true,
    }),
    UserCourse.create({
      user: accountA._id,
      courseId: "course-a",
      title: "Private course",
      totalLessons: 4,
      completedLessons: 2,
      progress: 50,
    }),
    StudySession.create({
      user: accountA._id,
      requestId: "session-a",
      durationSeconds: 1800,
      durationMinutes: 30,
      date: getKolkataDateString(),
    }),
    QuizAttempt.create({
      user: accountA._id,
      attemptId: "quiz-a",
      quizTitle: "Private quiz",
      score: 4,
      totalQuestions: 5,
      percentage: 80,
    }),
  ]);

  const notesB = await request(app).get("/api/notes").set(authB);
  assert.equal(notesB.status, 200);
  assert.deepEqual(notesB.body.data, []);
  assert.equal(
    (await request(app).put(`/api/notes/${noteA._id}`).set(authB).send({ title: "Stolen" }))
      .status,
    403
  );
  assert.equal((await request(app).delete(`/api/notes/${noteA._id}`).set(authB)).status, 403);
  assert.equal(
    (await request(app).put(`/api/tasks/${taskA._id}`).set(authB).send({ completed: false }))
      .status,
    404
  );
  assert.equal((await request(app).delete(`/api/tasks/${taskA._id}`).set(authB)).status, 404);

  const dashboardA = await request(app).get("/api/dashboard/stats").set(authA);
  const dashboardB = await request(app).get("/api/dashboard/stats").set(authB);
  assert.equal(dashboardA.status, 200);
  assert.equal(dashboardA.body.data.totalStudyMinutes, 30);
  assert.equal(dashboardA.body.data.completedLessonsCount, 2);
  assert.equal(dashboardA.body.data.quizzesCompleted, 1);
  assert.equal(dashboardA.body.data.tasksCount, 1);
  assert.equal(dashboardB.status, 200);
  assert.equal(dashboardB.body.data.totalStudyMinutes, 0);
  assert.equal(dashboardB.body.data.topicsCompleted, 0);
  assert.equal(dashboardB.body.data.quizzesCompleted, 0);
  assert.equal(dashboardB.body.data.tasksCount, 0);

  const [coursesA, coursesB, quizzesA, quizzesB, timerStatsA, timerStatsB] =
    await Promise.all([
      request(app).get("/api/courses").set(authA),
      request(app).get("/api/courses").set(authB),
      request(app).get("/api/quiz/history").set(authA),
      request(app).get("/api/quiz/history").set(authB),
      request(app).get("/api/timer/stats").set(authA),
      request(app).get("/api/timer/stats").set(authB),
    ]);
  assert.ok(coursesA.body.data.some((course) => course._id === courseA._id.toString()));
  assert.ok(coursesA.body.data.some((course) => course.courseId === "course-a"));
  assert.equal(coursesB.body.data.some((course) => course.courseId === "course-a"), false);
  assert.equal(
    (await request(app)
      .put(`/api/courses/${courseA._id}/progress`)
      .set(authB)
      .send({ progress: 10 })).status,
    404
  );
  assert.equal(
    (await request(app)
      .put(`/api/courses/${coursesB.body.data[0]._id}/progress`)
      .set(authA)
      .send({ progress: 10 })).status,
    404
  );
  assert.equal(quizzesA.body.count, 1);
  assert.equal(quizzesB.body.count, 0);
  assert.equal(timerStatsA.body.stats.totalMinutes, 30);
  assert.equal(timerStatsB.body.stats.totalMinutes, 0);

  const noteB = await Note.create({
    user: accountB._id,
    title: "Account B note",
    content: "Account B content",
  });
  const notesA = await request(app).get("/api/notes").set(authA);
  assert.deepEqual(notesA.body.data.map((note) => note._id), [noteA._id.toString()]);
  assert.equal(
    (await request(app).put(`/api/notes/${noteB._id}`).set(authA).send({ title: "Stolen" }))
      .status,
    403
  );
  assert.equal((await request(app).delete(`/api/notes/${noteB._id}`).set(authA)).status, 403);

  const attemptedTask = await request(app)
    .post("/api/tasks")
    .set(authB)
    .send({ user: accountA._id.toString(), title: "B-owned task" });
  assert.equal(attemptedTask.status, 201);
  assert.equal(attemptedTask.body.data.user, accountB._id.toString());
  const taskBId = attemptedTask.body.data._id;
  assert.equal(
    (await request(app).put(`/api/tasks/${taskBId}`).set(authA).send({ completed: true })).status,
    404
  );
  assert.equal((await request(app).delete(`/api/tasks/${taskBId}`).set(authA)).status, 404);

  const tasksA = await request(app).get("/api/tasks").set(authA);
  const tasksB = await request(app).get("/api/tasks").set(authB);
  assert.deepEqual(tasksA.body.data.map((task) => task._id), [taskA._id.toString()]);
  assert.deepEqual(tasksB.body.data.map((task) => task._id), [taskBId]);
  const finalDashboardA = await request(app).get("/api/dashboard/stats").set(authA);
  assert.equal(finalDashboardA.body.data.tasksCount, 1);
});
