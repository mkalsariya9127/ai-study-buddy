const crypto = require("crypto");

const normalizeEmail = (email) => email.trim().toLowerCase();

const isValidEmail = (email) =>
  typeof email === "string" &&
  email.length <= 254 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isStrongPassword = (password) =>
  typeof password === "string" &&
  password.length >= 8 &&
  password.length <= 128 &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /\d/.test(password);

const createOtp = () => crypto.randomInt(100000, 1000000).toString();

const hashOtp = (email, purpose, otp) =>
  crypto
    .createHmac("sha256", process.env.OTP_SECRET || process.env.JWT_SECRET)
    .update(`${email}:${purpose}:${otp}`)
    .digest("hex");

const compareOtp = (email, purpose, otp, expectedHash) => {
  if (typeof otp !== "string" || !/^\d{6}$/.test(otp) || !expectedHash) {
    return false;
  }

  const actual = Buffer.from(hashOtp(email, purpose, otp), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
};

module.exports = {
  compareOtp,
  createOtp,
  hashOtp,
  isStrongPassword,
  isValidEmail,
  normalizeEmail,
};
