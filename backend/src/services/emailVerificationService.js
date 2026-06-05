const crypto = require("crypto");

const env = require("../config/env");
const emailVerificationOtpModel = require("../models/emailVerificationOtpModel");
const { hashPassword } = require("../utils/password");
const { sendVerificationOtpEmail } = require("./emailService");

const generateOtp = () => {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
};

const createOtpExpiryDate = () => {
  const expiresAt = new Date();

  expiresAt.setMinutes(
    expiresAt.getMinutes() + env.emailVerificationOtpExpiresMinutes
  );

  return expiresAt;
};

const sendFreshEmailVerificationOtp = async (user) => {
  const otp = generateOtp();
  const otpHash = hashPassword(otp);

  await emailVerificationOtpModel.invalidateActiveEmailVerificationOtps(
    user.user_id
  );
  await emailVerificationOtpModel.createEmailVerificationOtp({
    expiresAt: createOtpExpiryDate(),
    otpHash,
    userId: user.user_id
  });

  try {
    await sendVerificationOtpEmail({
      email: user.email,
      firstName: user.firstname,
      otp
    });

    return true;
  } catch (error) {
    console.error("Failed to send email verification OTP:", error);
    return false;
  }
};

module.exports = {
  sendFreshEmailVerificationOtp
};
