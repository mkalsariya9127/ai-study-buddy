const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const {
  clearTestDatabase,
  startTestDatabase,
  stopTestDatabase,
} = require("./testDatabase");
const app = require("../server");
const User = require("../models/User");

test.before(startTestDatabase);
test.beforeEach(clearTestDatabase);
test.after(stopTestDatabase);

test("password reset gives the same response for registered and unknown emails", async () => {
  const user = await User.create({
    name: "Study User",
    email: "student@example.com",
    password: "StudyBuddyPass1",
    isVerified: true,
  });
  const agent = request.agent(app);
  const csrf = await agent.get("/api/auth/csrf");

  const requestReset = (email) =>
    agent
      .post("/api/auth/forgot-password")
      .set("X-CSRF-Token", csrf.body.csrfToken)
      .send({ email });
  const unknownReset = await requestReset("unknown@example.com");
  const knownReset = await requestReset(user.email);

  assert.equal(unknownReset.status, 200);
  assert.equal(knownReset.status, 200);
  assert.equal(unknownReset.body.message, knownReset.body.message);
  assert.equal(knownReset.body.resetToken, undefined);
  assert.equal(knownReset.body.otp, undefined);
});
