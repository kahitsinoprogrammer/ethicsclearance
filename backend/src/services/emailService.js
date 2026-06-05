const { Resend } = require("resend");

const env = require("../config/env");

const getResendClient = () => {
  if (!env.resendApiKey) {
    throw new Error("Resend API key is not configured.");
  }

  return new Resend(env.resendApiKey);
};

const sendVerificationOtpEmail = async ({ email, firstName, otp }) => {
  const resend = getResendClient();
  const recipientName = firstName || "there";

  const result = await resend.emails.send({
    from: env.resendFromEmail,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        <p>Hello ${recipientName},</p>
        <p>Your email verification code for the Ethics Clearance System is:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">${otp}</p>
        <p>This code will expire in ${env.emailVerificationOtpExpiresMinutes} minutes.</p>
        <p>If you did not request this code, you can ignore this email.</p>
      </div>
    `,
    subject: "Verify your email address",
    to: email
  });

  if (result.error) {
    throw new Error(result.error.message || "Failed to send verification email.");
  }
};

module.exports = {
  sendVerificationOtpEmail
};
