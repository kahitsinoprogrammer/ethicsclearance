const userService = require("../services/userService");

const getUsers = async (req, res, next) => {
  try {
    const payload = await userService.getUsers(req.query);

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

const getRoles = async (_req, res, next) => {
  try {
    const payload = await userService.getRoles();

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

const getUserRoles = async (req, res, next) => {
  try {
    const payload = await userService.getUserRoles(req.params.userId);

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

const registerUser = async (req, res, next) => {
  try {
    const payload = await userService.registerUser(req.body, req.user);

    res.status(201).json(payload);
  } catch (error) {
    next(error);
  }
};

const resendEmailVerificationOtp = async (req, res, next) => {
  try {
    const payload = await userService.resendEmailVerificationOtp(req.body);

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

const verifyEmailVerificationOtp = async (req, res, next) => {
  try {
    const payload = await userService.verifyEmailVerificationOtp(req.body);

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const payload = await userService.updateUser(
      req.params.userId,
      req.body,
      req.user
    );

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRoles,
  getUserRoles,
  getUsers,
  registerUser,
  resendEmailVerificationOtp,
  updateUser,
  verifyEmailVerificationOtp
};
