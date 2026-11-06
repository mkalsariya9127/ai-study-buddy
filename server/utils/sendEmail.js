const nodemailer = require("nodemailer");

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);

const sendEmail = async ({ email, subject, otp, message }) => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  if (!emailUser || !emailPass) {
    const error = new Error("SMTP is not configured.");
    error.code = "SMTP_NOT_CONFIGURED";
    throw error;
  }

  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: { user: emailUser, pass: emailPass },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
  });
  const safeMessage = escapeHtml(message || "Your security code is:");
  const safeOtp = escapeHtml(otp);

  try {
    await transporter.sendMail({
      from: `"AI Study Buddy" <${emailUser}>`,
      to: email,
      subject: subject || "Your AI Study Buddy security code",
      text: `${message || "Your security code is"} ${otp}. It expires soon.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:25px;border:1px solid #e0e0e0;border-radius:12px"><h2 style="color:#6952dc">AI Study Buddy</h2><p>${safeMessage}</p><p style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#6952dc">${safeOtp}</p><p>This code expires shortly. Do not share it with anyone.</p></div>`,
    });
  } catch {
    const error = new Error("Email delivery failed.");
    error.code = "EMAIL_DELIVERY_FAILED";
    throw error;
  }
};

module.exports = sendEmail;
