const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.resolve(__dirname, "../../.env")
});

module.exports = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  clientUrl: process.env.CLIENT_URL || "",
  databaseUrl: process.env.DATABASE_URL || "",
  dbHost: process.env.DB_HOST || "",
  dbPort: Number(process.env.DB_PORT) || 5432,
  dbName: process.env.DB_NAME || "",
  dbUser: process.env.DB_USER || "",
  dbPassword: process.env.DB_PASSWORD || "",
  dbSsl: process.env.DB_SSL === "true",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  jwtSecret: process.env.JWT_SECRET || "change-this-secret",
  resendApiKey:
    process.env.RESEND_API_KEY || "re_7GJgAUry_PzFnMVuiM9z8GzkewNB51i3k",
  resendFromEmail: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
  emailVerificationOtpExpiresMinutes:
    Number(process.env.EMAIL_VERIFICATION_OTP_EXPIRES_MINUTES) || 5,
};
