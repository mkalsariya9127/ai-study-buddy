require("dotenv").config();
const mongoose = require("mongoose");
const { hashOtp } = require("../utils/authSecurity");

const migrate = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI must be configured before migrating authentication fields.");
  }
  const otpSecret = process.env.OTP_SECRET || process.env.JWT_SECRET;
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || otpSecret.length < 32) {
    throw new Error("Configure JWT_SECRET and OTP_SECRET before migrating authentication fields.");
  }

  await mongoose.connect(process.env.MONGO_URI);
  const users = mongoose.connection.collection("users");
  const now = new Date();
  const cursor = users.find({
    $or: [
      { otp: { $type: "string" } },
      { resetPasswordToken: { $type: "string" } },
    ],
  });
  let migrated = 0;

  for await (const user of cursor) {
    const email = String(user.email || "").trim().toLowerCase();
    const set = {};
    const unset = {
      otp: "",
      otpExpires: "",
      resetPasswordToken: "",
      resetPasswordExpires: "",
    };

    if (email && /^\d{6}$/.test(user.otp || "") && user.otpExpires > now) {
      set.otpHash = hashOtp(email, "verify", user.otp);
      set.otpExpiresAt = user.otpExpires;
      set.otpAttempts = 0;
    } else {
      unset.otpHash = "";
      unset.otpExpiresAt = "";
    }

    if (
      email &&
      /^\d{6}$/.test(user.resetPasswordToken || "") &&
      user.resetPasswordExpires > now
    ) {
      set.resetOtpHash = hashOtp(email, "reset", user.resetPasswordToken);
      set.resetOtpExpiresAt = user.resetPasswordExpires;
      set.resetOtpAttempts = 0;
    } else {
      unset.resetOtpHash = "";
      unset.resetOtpExpiresAt = "";
    }

    await users.updateOne({ _id: user._id }, { $set: set, $unset: unset });
    migrated += 1;
  }

  console.log(`[Auth migration]: Updated ${migrated} user record(s).`);
};

migrate()
  .catch((error) => {
    console.error("[Auth migration]: Failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
