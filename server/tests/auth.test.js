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
const { hashOtp } = require("../utils/authSecurity");

const PASSWORD = "StudyBuddyPass1";

const makeAgent = async () => {
  const agent = request.agent(app);
  const csrf = await agent.get("/api/auth/csrf");
  assert.equal(csrf.status, 200);
  assert.ok(csrf.headers["set-cookie"].some((cookie) => /studyBuddyCsrf=/i.test(cookie)));
  return { agent, csrfToken: csrf.body.csrfToken };
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

test("valid credentials issue HttpOnly session cookies and protected profile is safe", async () => {
  const user = await createUser({
    otpHash: "private-otp-hash",
    resetOtpHash: "private-reset-hash",
  });
  const { agent, csrfToken } = await makeAgent();
  const response = await agent
    .post("/api/auth/login")
    .set("X-CSRF-Token", csrfToken)
    .send({ email: "STUDENT@example.com", password: PASSWORD });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.token, undefined);
  assert.equal(response.body.user.email, "student@example.com");
  assert.ok(response.headers["set-cookie"].some((cookie) => /studyBuddySession=.*HttpOnly/i.test(cookie)));
  assert.ok(response.headers["set-cookie"].some((cookie) => /studyBuddyRefresh=.*HttpOnly/i.test(cookie)));

  const profile = await agent.get("/api/user/profile");
  assert.equal(profile.status, 200);
  assert.equal(profile.body.user.password, undefined);
  assert.equal(profile.body.user.otpHash, undefined);
  assert.equal(profile.body.user.resetOtpHash, undefined);

  const stored = await User.findById(user._id).select("+password");
  assert.notEqual(stored.password, PASSWORD);
});

test("wrong, unknown, empty, and unverified login attempts are rejected", async () => {
  await createUser();
  await createUser({ email: "pending@example.com", isVerified: false });
  const { agent, csrfToken } = await makeAgent();
  const login = (credentials) =>
    agent.post("/api/auth/login").set("X-CSRF-Token", csrfToken).send(credentials);

  assert.equal((await login({ email: "student@example.com", password: "WrongPass1" })).status, 401);
  assert.equal((await login({ email: "missing@example.com", password: "AnyPass1" })).status, 401);
  assert.equal((await login({ email: "", password: "" })).status, 400);
  assert.equal((await login({ email: "pending@example.com", password: PASSWORD })).status, 401);
});

test("verification OTP must be valid, unexpired, and single use", async () => {
  const email = "pending@example.com";
  const user = await createUser({ email, isVerified: false });
  const otp = "846219";
  user.otpHash = hashOtp(email, "verify", otp);
  user.otpExpiresAt = new Date(Date.now() + 60_000);
  user.otpAttempts = 0;
  await user.save();

  const { agent, csrfToken } = await makeAgent();
  const verify = (code) =>
    agent
      .post("/api/auth/verify-otp")
      .set("X-CSRF-Token", csrfToken)
      .send({ email, otp: code });

  assert.equal((await verify("123456")).status, 400);
  const valid = await verify(otp);
  assert.equal(valid.status, 200);
  assert.equal(valid.body.token, undefined);
  assert.equal((await verify(otp)).status, 400);

  const expiredEmail = "expired@example.com";
  const expired = await createUser({ email: expiredEmail, isVerified: false });
  expired.otpHash = hashOtp(expiredEmail, "verify", otp);
  expired.otpExpiresAt = new Date(Date.now() - 1000);
  await expired.save();
  const expiredResponse = await agent
    .post("/api/auth/verify-otp")
    .set("X-CSRF-Token", csrfToken)
    .send({ email: expiredEmail, otp });
  assert.equal(expiredResponse.status, 400);
});

test("password reset rejects bypass codes and revokes existing sessions", async () => {
  const user = await createUser();
  const { agent, csrfToken } = await makeAgent();

  assert.equal(
    (await agent
      .post("/api/auth/reset-password")
      .set("X-CSRF-Token", csrfToken)
      .send({ email: user.email, resetToken: "123456", newPassword: "ChangedPass1" })).status,
    400
  );

  const login = await agent
    .post("/api/auth/login")
    .set("X-CSRF-Token", csrfToken)
    .send({ email: user.email, password: PASSWORD });
  assert.equal(login.status, 200);

  const resetOtp = "392810";
  user.resetOtpHash = hashOtp(user.email, "reset", resetOtp);
  user.resetOtpExpiresAt = new Date(Date.now() + 60_000);
  user.resetOtpAttempts = 0;
  await user.save();

  const reset = await agent
    .post("/api/auth/reset-password")
    .set("X-CSRF-Token", csrfToken)
    .send({ email: user.email, resetToken: resetOtp, newPassword: "ChangedPass1" });
  assert.equal(reset.status, 200);
  const postResetCsrf = await agent.get("/api/auth/csrf");
  assert.equal(postResetCsrf.status, 200);
  const reusedResetOtp = await agent
    .post("/api/auth/reset-password")
    .set("X-CSRF-Token", postResetCsrf.body.csrfToken)
    .send({ email: user.email, resetToken: resetOtp, newPassword: "AgainPass1" });
  assert.equal(reusedResetOtp.status, 400);
  assert.equal((await agent.get("/api/user/profile")).status, 401);

  const newLogin = await agent
    .post("/api/auth/login")
    .set("X-CSRF-Token", postResetCsrf.body.csrfToken)
    .send({ email: user.email, password: "ChangedPass1" });
  assert.equal(newLogin.status, 200);
});

test("logout revokes the session and clears session cookies", async () => {
  const user = await createUser();
  const { agent, csrfToken } = await makeAgent();
  const login = await agent
    .post("/api/auth/login")
    .set("X-CSRF-Token", csrfToken)
    .send({ email: user.email, password: PASSWORD });
  assert.equal(login.status, 200);

  const logout = await agent
    .post("/api/auth/logout")
    .set("X-CSRF-Token", csrfToken)
    .send({});
  assert.equal(logout.status, 200);
  assert.equal((await agent.get("/api/user/profile")).status, 401);

  const stored = await User.findById(user._id);
  assert.equal(stored.tokenVersion, 1);
});

test("expired JWTs and invalid Google credentials are rejected", async () => {
  const user = await createUser();
  const expiredToken = jwt.sign(
    { id: user._id.toString(), tokenVersion: 0, tokenUse: "access" },
    process.env.JWT_SECRET,
    {
      expiresIn: -1,
      issuer: "ai-study-buddy",
      audience: "ai-study-buddy-client",
    }
  );
  assert.equal(
    (await request(app)
      .get("/api/user/profile")
      .set("Cookie", `studyBuddySession=${expiredToken}`)).status,
    401
  );

  const { agent, csrfToken } = await makeAgent();
  const invalidGoogle = await agent
    .post("/api/auth/google")
    .set("X-CSRF-Token", csrfToken)
    .send({ credential: "not.a.valid.token" });
  assert.equal(invalidGoogle.status, 401);

  user.resetOtpHash = hashOtp(user.email, "reset", "735829");
  user.resetOtpExpiresAt = new Date(Date.now() - 1000);
  user.resetOtpAttempts = 0;
  await user.save();
  const expiredReset = await agent
    .post("/api/auth/reset-password")
    .set("X-CSRF-Token", csrfToken)
    .send({ email: user.email, resetToken: "735829", newPassword: "ChangedPass1" });
  assert.equal(expiredReset.status, 400);
});
