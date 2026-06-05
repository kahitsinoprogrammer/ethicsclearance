const jwt = require("jsonwebtoken");

const env = require("../config/env");
const { sendFreshEmailVerificationOtp } = require("./emailVerificationService");
const userModel = require("../models/userModel");
const { verifyPassword } = require("../utils/password");
const { buildApiResponse } = require("../utils/response");

const createAuthError = () => {
  const error = new Error("Invalid username or password.");
  error.statusCode = 401;
  return error;
};

const createVerificationRequiredError = (user, emailSent) => {
  const error = new Error("Verify your email address before signing in.");
  error.statusCode = 403;
  error.data = {
    email: user.email,
    emailSent,
    requiresEmailVerification: true,
    userId: user.user_id
  };
  return error;
};

const sanitizeUser = (user) => {
  const { password: _password, ...safeUser } = user;
  return safeUser;
};

const login = async ({ username, password }) => {
  const normalizedUsername = typeof username === "string" ? username.trim() : "";
  const normalizedPassword = typeof password === "string" ? password : "";

  if (!normalizedUsername || !normalizedPassword) {
    throw createAuthError();
  }

  const user = await userModel.findUserByUsername(normalizedUsername);

  if (!user || !verifyPassword(normalizedPassword, user.password)) {
    throw createAuthError();
  }

  if (!user.is_active) {
    throw createAuthError();
  }

  if (!user.is_verified) {
    const emailSent = await sendFreshEmailVerificationOtp(user);

    throw createVerificationRequiredError(user, emailSent);
  }

  const token = jwt.sign(
    {
      username: user.username,
      userType: user.user_type
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
      subject: user.user_id
    }
  );

  return buildApiResponse(
    {
      token,
      user: sanitizeUser(user)
    },
    "Login successful"
  );
};

const getCurrentUser = (user) => {
  return buildApiResponse(user);
};

module.exports = {
  getCurrentUser,
  login
};
