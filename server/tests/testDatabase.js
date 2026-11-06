process.env.NODE_ENV = "test";
process.env.JWT_SECRET =
  process.env.JWT_SECRET || "test-only-jwt-secret-with-more-than-32-characters";
process.env.OTP_SECRET =
  process.env.OTP_SECRET || "test-only-otp-secret-with-more-than-32-characters";
process.env.GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID || "test-client-id.apps.googleusercontent.com";
process.env.EMAIL_USER = "";
process.env.EMAIL_PASS = "";

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const User = require("../models/User");
const Note = require("../models/Note");
const Task = require("../models/Task");
const { UserCourse } = require("../models/Course");
const CourseCompletion = require("../models/CourseCompletion");
const StudySession = require("../models/StudySession");
const QuizAttempt = require("../models/Quiz");
const Settings = require("../models/Settings");

let mongo;
const LOCAL_TEST_URI = process.env.TEST_MONGO_URI || "mongodb://127.0.0.1:27017/studybuddy_test";

const startTestDatabase = async () => {
  try {
    await mongoose.connect(LOCAL_TEST_URI, { serverSelectionTimeoutMS: 2000 });
  } catch {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  }
  await Promise.all([
    User.createIndexes(),
    Note.createIndexes(),
    Task.createIndexes(),
    UserCourse.createIndexes(),
    CourseCompletion.createIndexes(),
    StudySession.createIndexes(),
    QuizAttempt.createIndexes(),
    Settings.createIndexes(),
  ]);
};

const clearTestDatabase = async () => {
  await Promise.all(
    Object.values(mongoose.connection.collections).map((collection) =>
      collection.deleteMany({})
    )
  );
};

const stopTestDatabase = async () => {
  await mongoose.disconnect();
  if (mongo) {
    await mongo.stop();
  }
};

module.exports = { clearTestDatabase, startTestDatabase, stopTestDatabase };
