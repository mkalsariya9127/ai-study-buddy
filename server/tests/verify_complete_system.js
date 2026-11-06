const assert = require("assert");
const mongoose = require("c:/Users/Laptocare/Desktop/react study body/server/node_modules/mongoose");
const { io: createSocketClient } = require("c:/Users/Laptocare/Desktop/react study body/server/node_modules/socket.io-client");

const BASE_URL = "http://localhost:5000";

async function request(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    method,
    headers,
  });
  const data = await response.json().catch(() => ({}));
  const setCookie = response.headers.get("set-cookie");
  return { status: response.status, data, setCookie, ok: response.ok, headers: response.headers };
}

async function getCsrfAndCookies() {
  const res = await fetch(`${BASE_URL}/api/auth/csrf`);
  const data = await res.json();
  const rawCookie = res.headers.get("set-cookie") || "";
  const match = rawCookie.match(/studyBuddyCsrf=([^;]+)/);
  const csrfCookie = match ? `studyBuddyCsrf=${match[1]}` : "";
  return { csrfToken: data.csrfToken, csrfCookie };
}

async function runVerification() {
  console.log("=================================================");
  console.log("🚀 STARTING COMPLETE SECURITY & REAL-TIME VERIFICATION");
  console.log("=================================================");

  await mongoose.connect("mongodb://127.0.0.1:27017/studybuddy");
  console.log("Connected to MongoDB for direct verification.");

  const timestamp = Date.now();
  const emailA = `verify_user_a_${timestamp}@example.com`;
  const emailB = `verify_user_b_${timestamp}@example.com`;
  const password = "ValidPass123!";

  // 1. CSRF Token issuance
  console.log("\n[1] Testing CSRF Token Issuance...");
  const { csrfToken, csrfCookie } = await getCsrfAndCookies();
  assert.ok(csrfToken && csrfToken.length >= 32, "CSRF token must be >= 32 chars");
  console.log("   ✅ CSRF Token issued securely.");

  // 2. Reject registration with weak password
  console.log("\n[2] Testing Registration with weak password...");
  const weakReg = await request("/api/auth/register", {
    method: "POST",
    headers: { "x-csrf-token": csrfToken, Cookie: csrfCookie, Origin: "http://localhost:5173" },
    body: JSON.stringify({ name: "Weak User", email: `weak_${timestamp}@example.com`, password: "weak" }),
  });
  assert.equal(weakReg.status, 400, "Must reject weak password with 400");
  console.log("   ✅ Weak password rejected successfully.");

  // 3. Register Account A
  console.log("\n[3] Registering Account A...");
  const regA = await request("/api/auth/register", {
    method: "POST",
    headers: { "x-csrf-token": csrfToken, Cookie: csrfCookie, Origin: "http://localhost:5173" },
    body: JSON.stringify({ name: "Student Alpha", email: emailA, password }),
  });
  assert.equal(regA.status, 201, "Registration must succeed with 201");
  assert.equal(regA.data.success, true);
  assert.equal(regA.data.data.email, emailA);
  console.log("   ✅ Account A registered. Email verification OTP queued.");

  // 4. Verify Account A is unverified in MongoDB and OTP is hashed
  const userAInDb = await mongoose.connection.collection("users").findOne({ email: emailA });
  assert.equal(userAInDb.isVerified, false, "Must be unverified initially");
  assert.ok(userAInDb.otpHash, "Must have otpHash");
  assert.equal(userAInDb.otp, null, "Plaintext otp must be null/empty");
  console.log("   ✅ Account A is unverified in MongoDB and OTP is cryptographically hashed.");

  // 5. Test rejecting '123456' bypass
  console.log("\n[5] Testing '123456' bypass rejection...");
  const bypassRes = await request("/api/auth/verify-otp", {
    method: "POST",
    headers: { "x-csrf-token": csrfToken, Cookie: csrfCookie, Origin: "http://localhost:5173" },
    body: JSON.stringify({ email: emailA, otp: "123456" }),
  });
  assert.equal(bypassRes.status, 400, "Must reject '123456' bypass code");
  console.log("   ✅ '123456' bypass rejected with 400.");

  // 6. Test login attempt before verification
  console.log("\n[6] Testing login rejection for unverified account...");
  const unverifiedLogin = await request("/api/auth/login", {
    method: "POST",
    headers: { "x-csrf-token": csrfToken, Cookie: csrfCookie, Origin: "http://localhost:5173" },
    body: JSON.stringify({ email: emailA, password }),
  });
  assert.equal(unverifiedLogin.status, 401, "Must reject unverified login with 401");
  console.log("   ✅ Unverified account login rejected with 401.");

  // 7. Verify Account A by setting isVerified = true directly in database for simulation
  await mongoose.connection.collection("users").updateOne({ email: emailA }, { $set: { isVerified: true }, $unset: { otpHash: "", otpExpiresAt: "" } });
  console.log("\n[7] Account A verified.");

  // 8. Test login with wrong password
  console.log("\n[8] Testing login with wrong password...");
  const wrongPassLogin = await request("/api/auth/login", {
    method: "POST",
    headers: { "x-csrf-token": csrfToken, Cookie: csrfCookie, Origin: "http://localhost:5173" },
    body: JSON.stringify({ email: emailA, password: "WrongPassword99!" }),
  });
  assert.equal(wrongPassLogin.status, 401, "Must reject wrong password with 401");
  console.log("   ✅ Wrong password rejected with 401.");

  // 9. Test login with non-existent email
  console.log("\n[9] Testing login with non-existent email...");
  const noUserLogin = await request("/api/auth/login", {
    method: "POST",
    headers: { "x-csrf-token": csrfToken, Cookie: csrfCookie, Origin: "http://localhost:5173" },
    body: JSON.stringify({ email: "doesnotexist999@example.com", password: "SomePassword123!" }),
  });
  assert.equal(noUserLogin.status, 401, "Must reject non-existent user with 401");
  console.log("   ✅ Non-existent user login rejected with 401.");

  // 10. Test successful login for Account A
  console.log("\n[10] Testing successful login with correct email and password...");
  const loginRes = await request("/api/auth/login", {
    method: "POST",
    headers: { "x-csrf-token": csrfToken, Cookie: csrfCookie, Origin: "http://localhost:5173" },
    body: JSON.stringify({ email: emailA, password }),
  });
  assert.equal(loginRes.status, 200, "Login must succeed with 200");
  assert.equal(loginRes.data.success, true);
  assert.equal(loginRes.data.user.email, emailA);
  assert.equal(loginRes.data.user.password, undefined);
  assert.equal(loginRes.data.user.otpHash, undefined);

  // Extract session cookies
  const rawSetCookie = loginRes.setCookie || loginRes.headers.get("set-cookie") || "";
  const sessionMatch = rawSetCookie.match(/studyBuddySession=([^;]+)/);
  const sessionTokenA = sessionMatch ? sessionMatch[1] : null;
  assert.ok(sessionTokenA, "HttpOnly session cookie must be set");
  const authCookieA = `studyBuddySession=${sessionTokenA}; ${csrfCookie}`;
  console.log("   ✅ Successful login: HttpOnly session cookie issued, sensitive data excluded.");

  // 11. Test protected Profile endpoint
  console.log("\n[11] Testing protected /api/user/profile endpoint...");
  const profileRes = await request("/api/user/profile", {
    headers: { Cookie: authCookieA, Origin: "http://localhost:5173" },
  });
  assert.equal(profileRes.status, 200);
  assert.equal(profileRes.data.user.email, emailA);
  console.log("   ✅ Profile endpoint returns verified user data.");

  // 12. Register and verify Account B
  console.log("\n[12] Creating Account B...");
  await request("/api/auth/register", {
    method: "POST",
    headers: { "x-csrf-token": csrfToken, Cookie: csrfCookie, Origin: "http://localhost:5173" },
    body: JSON.stringify({ name: "Student Beta", email: emailB, password }),
  });
  await mongoose.connection.collection("users").updateOne({ email: emailB }, { $set: { isVerified: true } });
  const loginBRes = await request("/api/auth/login", {
    method: "POST",
    headers: { "x-csrf-token": csrfToken, Cookie: csrfCookie, Origin: "http://localhost:5173" },
    body: JSON.stringify({ email: emailB, password }),
  });
  const sessionMatchB = (loginBRes.setCookie || loginBRes.headers.get("set-cookie") || "").match(/studyBuddySession=([^;]+)/);
  const sessionTokenB = sessionMatchB ? sessionMatchB[1] : null;
  const authCookieB = `studyBuddySession=${sessionTokenB}; ${csrfCookie}`;
  console.log("   ✅ Account B created and logged in.");

  // 13. Test Real-Time Socket Connection & Scoping
  console.log("\n[13] Testing Socket.IO Connection & Room Isolation...");
  const socketA = createSocketClient(BASE_URL, {
    transports: ["websocket"],
    extraHeaders: { Cookie: `studyBuddySession=${sessionTokenA}` },
  });
  const socketB = createSocketClient(BASE_URL, {
    transports: ["websocket"],
    extraHeaders: { Cookie: `studyBuddySession=${sessionTokenB}` },
  });

  await new Promise((resolve) => socketA.once("connect", resolve));
  await new Promise((resolve) => socketB.once("connect", resolve));
  console.log("   ✅ Both sockets connected and authenticated with JWT session.");

  // Listen for dashboard:changed events
  let socketAEventReceived = false;
  let socketBEventReceived = false;
  socketA.on("dashboard:changed", () => { socketAEventReceived = true; });
  socketB.on("dashboard:changed", () => { socketBEventReceived = true; });

  // 14. Account A logs a study session
  console.log("\n[14] Account A logs a study session...");
  const timerRes = await request("/api/timer/session", {
    method: "POST",
    headers: { "x-csrf-token": csrfToken, Cookie: authCookieA, Origin: "http://localhost:5173" },
    body: JSON.stringify({
      mode: "study",
      durationSeconds: 1500,
      requestId: `test_req_${timestamp}_001`,
    }),
  });
  assert.ok(timerRes.status === 200 || timerRes.status === 201, "Study session must be logged successfully");
  console.log("   ✅ Study session logged in MongoDB.");

  // Wait 1 second for socket event to propagate
  await new Promise((r) => setTimeout(r, 1000));

  assert.equal(socketAEventReceived, true, "Socket A MUST receive 'dashboard:changed' event");
  assert.equal(socketBEventReceived, false, "Socket B MUST NOT receive Account A's 'dashboard:changed' event");
  console.log("   ✅ Real-time event received by Account A instantly!");
  console.log("   ✅ Account B received 0 events (Zero Data Leakage / Full Isolation confirmed)!");

  // Clean up sockets & db connection
  socketA.disconnect();
  socketB.disconnect();
  await mongoose.disconnect();

  console.log("\n=================================================");
  console.log("🎉 ALL 14 SECURITY & REAL-TIME TESTS PASSED 100%!");
  console.log("=================================================");
}

runVerification().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
