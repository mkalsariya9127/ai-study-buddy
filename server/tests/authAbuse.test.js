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
const { hashOtp } = require("../utils/authSecurity");

const PASSWORD = "StudyBuddyPass1";

const makeAgent = async () => {
  const agent = request.agent(app);
  const response = await agent.get("/api/auth/csrf");
  return { agent, csrfToken: response.body.csrfToken };
};

const createUser = (overrides = {}) =>
  User.create({
    name: "Study User",
    email: "student@example.com",
    password: PASSWORD,
    isVerified: true,
    ...overrides,
  });

test.before(startTestDatabase);
test.beforeEach(clearTestDatabase);
test.after(stopTestDatabase);

test("repeated wrong passwords trigger progressive account lockout", async () => {
  const user = await createUser();
  const { agent, csrfToken } = await makeAgent();
  const wrongLogin = () =>
    agent
      .post("/api/auth/login")
      .set("X-CSRF-Token", csrfToken)
      .send({ email: user.email, password: "WrongPass1" });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.equal((await wrongLogin()).status, 401);
  }

  const locked = await User.findById(user._id).select("+failedLoginAttempts +lockUntil");
  assert.equal(locked.failedLoginAttempts, 5);
  assert.ok(locked.lockUntil > new Date());

  const blockedCorrectPassword = await agent
    .post("/api/auth/login")
    .set("X-CSRF-Token", csrfToken)
    .send({ email: user.email, password: PASSWORD });
  assert.equal(blockedCorrectPassword.status, 429);
  assert.equal(blockedCorrectPassword.body.token, undefined);
});

test("verification OTP attempts are capped and resend cooldown is enforced", async () => {
  const email = "pending@example.com";
  const user = await createUser({
    email,
    isVerified: false,
    otpHash: hashOtp(email, "verify", "846219"),
    otpExpiresAt: new Date(Date.now() + 60_000),
    otpAttempts: 0,
    otpLastSentAt: new Date(),
    otpWindowStartedAt: new Date(),
    otpSendCount: 1,
  });
  const { agent, csrfToken } = await makeAgent();
  const verify = () =>
    agent
      .post("/api/auth/verify-otp")
      .set("X-CSRF-Token", csrfToken)
      .send({ email, otp: "111111" });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.equal((await verify()).status, 400);
  }
  const correctAfterLimit = await agent
    .post("/api/auth/verify-otp")
    .set("X-CSRF-Token", csrfToken)
    .send({ email, otp: "846219" });
  assert.equal(correctAfterLimit.status, 400);

  const resend = await agent
    .post("/api/auth/resend-otp")
    .set("X-CSRF-Token", csrfToken)
    .send({ email });
  assert.equal(resend.status, 429);
  assert.equal(resend.body.otp, undefined);

  const updated = await User.findById(user._id).select("+otpAttempts");
  assert.equal(updated.otpAttempts, 5);
});

test("signup validates input and rejects duplicate registered email addresses", async () => {
  const { agent, csrfToken } = await makeAgent();
  const signup = (body) =>
    agent.post("/api/auth/register").set("X-CSRF-Token", csrfToken).send(body);

  assert.equal(
    (await signup({ name: "Student", email: "invalid", password: PASSWORD })).status,
    400
  );
  assert.equal(
    (await signup({ name: "Student", email: "new@example.com", password: "weak" })).status,
    400
  );
  assert.equal(await User.countDocuments(), 0);

  await createUser({ email: "registered@example.com" });
  const duplicate = await signup({
    name: "Student",
    email: "REGISTERED@example.com",
    password: PASSWORD,
  });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.otp, undefined);
});
