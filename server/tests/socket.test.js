const test = require("node:test");
const assert = require("node:assert/strict");
const { io: createSocketClient } = require("socket.io-client");
const request = require("supertest");
const {
  clearTestDatabase,
  startTestDatabase,
  stopTestDatabase,
} = require("./testDatabase");
const app = require("../server");
const User = require("../models/User");
const Task = require("../models/Task");
const { UserCourse } = require("../models/Course");
const StudySession = require("../models/StudySession");
const QuizAttempt = require("../models/Quiz");
const { createSessionToken } = require("../utils/session");

const createUser = (email) =>
  User.create({
    name: "Study User",
    email,
    password: "StudyBuddyPass1",
    isVerified: true,
  });

const connectSocket = (url, token) =>
  new Promise((resolve, reject) => {
    const socket = createSocketClient(url, {
      transports: ["websocket"],
      reconnection: false,
      extraHeaders: token ? { Cookie: `studyBuddySession=${token}` } : {},
    });
    const timeout = setTimeout(() => reject(new Error("Socket connection timed out")), 3000);
    socket.once("connect", () => {
      clearTimeout(timeout);
      resolve(socket);
    });
    socket.once("connect_error", (error) => {
      clearTimeout(timeout);
      resolve({ error, socket });
    });
  });

const waitForDashboardRecord = (socket, getRecord, message) =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(message)), 3000);
    socket.once("dashboard:changed", () => {
      clearTimeout(timeout);
      Promise.resolve().then(getRecord).then(resolve, reject);
    });
  });

test.before(startTestDatabase);
test.beforeEach(clearTestDatabase);
test.after(async () => {
  await new Promise((resolve) => app.io.close(resolve));
  await stopTestDatabase();
});

test("socket authentication rejects anonymous clients and dashboard events stay user-scoped", async () => {
  const accountA = await createUser("socket-a@example.com");
  const accountB = await createUser("socket-b@example.com");
  const courseA = await UserCourse.create({
    user: accountA._id,
    courseId: "socket-course-a",
    title: "Socket Course",
    totalLessons: 4,
  });
  await new Promise((resolve) => app.server.listen(0, resolve));
  const address = app.server.address();
  const url = `http://127.0.0.1:${address.port}`;

  const anonymous = await connectSocket(url);
  assert.ok(anonymous.error);
  anonymous.socket.close();

  const sessionTokenA = createSessionToken(accountA);
  const socketA = await connectSocket(url, sessionTokenA);
  const socketB = await connectSocket(url, createSessionToken(accountB));
  const secondTabA = await connectSocket(url, sessionTokenA);
  assert.equal(socketA.connected, true);
  assert.equal(socketB.connected, true);
  assert.equal(secondTabA.connected, true);

  let receivedA = 0;
  let receivedB = 0;
  let receivedSecondTabA = 0;
  socketA.on("dashboard:changed", () => {
    receivedA += 1;
  });
  socketB.on("dashboard:changed", () => {
    receivedB += 1;
  });
  secondTabA.on("dashboard:changed", () => {
    receivedSecondTabA += 1;
  });
  socketA.emit("join-room", `user:${accountB._id}`);
  const persistedTaskPromise = waitForDashboardRecord(
    socketA,
    () => Task.findOne({ user: accountA._id, title: "Persisted task" }),
    "Dashboard event timed out"
  );
  const response = await request(app)
    .post("/api/tasks")
    .set("Authorization", `Bearer ${sessionTokenA}`)
    .send({ title: "Persisted task" });
  assert.equal(response.status, 201);
  const persistedTask = await persistedTaskPromise;
  await new Promise((resolve) => setTimeout(resolve, 100));

  assert.ok(persistedTask);
  assert.equal(receivedA, 1);
  assert.equal(receivedSecondTabA, 1);
  assert.equal(receivedB, 0);

  socketA.disconnect();
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Socket reconnect timed out")), 3000);
    socketA.once("connect", () => {
      clearTimeout(timeout);
      resolve();
    });
    socketA.once("connect_error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    socketA.connect();
  });

  const reconnectedTaskPromise = waitForDashboardRecord(
    socketA,
    () => Task.findOne({ user: accountA._id, title: "After reconnect" }),
    "Dashboard event after reconnect timed out"
  );
  const reconnectedResponse = await request(app)
    .post("/api/tasks")
    .set("Authorization", `Bearer ${sessionTokenA}`)
    .send({ title: "After reconnect" });
  assert.equal(reconnectedResponse.status, 201);
  assert.ok(await reconnectedTaskPromise);
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(receivedA, 2);
  assert.equal(receivedSecondTabA, 2);
  assert.equal(receivedB, 0);

  const completionRequestId = "completion-request-0001";
  const coursePromise = waitForDashboardRecord(
    socketA,
    () => UserCourse.findById(courseA._id),
    "Course completion event timed out"
  );
  const courseResponse = await request(app)
    .post(`/api/courses/${courseA._id}/lesson-complete`)
    .set("Authorization", `Bearer ${sessionTokenA}`)
    .send({ requestId: completionRequestId });
  assert.equal(courseResponse.status, 200);
  assert.equal((await coursePromise).completedLessons, 1);
  const duplicateCourseResponse = await request(app)
    .post(`/api/courses/${courseA._id}/lesson-complete`)
    .set("Authorization", `Bearer ${sessionTokenA}`)
    .send({ requestId: completionRequestId });
  assert.equal(duplicateCourseResponse.status, 200);
  assert.equal(duplicateCourseResponse.body.duplicate, true);

  const timerRequestId = "study-session-request-0001";
  const studySessionPromise = waitForDashboardRecord(
    socketA,
    () => StudySession.findOne({ user: accountA._id, requestId: timerRequestId }),
    "Study session event timed out"
  );
  const timerResponse = await request(app)
    .post("/api/timer/session")
    .set("Authorization", `Bearer ${sessionTokenA}`)
    .send({ mode: "study", durationSeconds: 60, requestId: timerRequestId });
  assert.equal(timerResponse.status, 201);
  assert.ok(await studySessionPromise);
  const duplicateTimerResponse = await request(app)
    .post("/api/timer/session")
    .set("Authorization", `Bearer ${sessionTokenA}`)
    .send({ mode: "study", durationSeconds: 60, requestId: timerRequestId });
  assert.equal(duplicateTimerResponse.status, 200);
  assert.equal(duplicateTimerResponse.body.duplicate, true);

  const quizAttemptId = "quiz-attempt-request-0001";
  const quizAttemptPromise = waitForDashboardRecord(
    socketA,
    () => QuizAttempt.findOne({ user: accountA._id, attemptId: quizAttemptId }),
    "Quiz completion event timed out"
  );
  const quizResponse = await request(app)
    .post("/api/quiz/submit")
    .set("Authorization", `Bearer ${sessionTokenA}`)
    .send({
      attemptId: quizAttemptId,
      answers: { 0: 1, 1: 1, 2: 2, 3: 1, 4: 0 },
    });
  assert.equal(quizResponse.status, 200);
  assert.equal((await quizAttemptPromise).score, 5);
  const duplicateQuizResponse = await request(app)
    .post("/api/quiz/submit")
    .set("Authorization", `Bearer ${sessionTokenA}`)
    .send({
      attemptId: quizAttemptId,
      answers: { 0: 1, 1: 1, 2: 2, 3: 1, 4: 0 },
    });
  assert.equal(duplicateQuizResponse.status, 200);
  assert.equal(duplicateQuizResponse.body.duplicate, true);

  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(receivedA, 5);
  assert.equal(receivedSecondTabA, 5);
  assert.equal(receivedB, 0);

  socketA.close();
  socketB.close();
  secondTabA.close();
});
