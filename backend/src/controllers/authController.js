const authService = require("../services/authService");

const login = async (req, res, next) => {
  try {
    const payload = await authService.login(req.body);

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

const getCurrentUser = (req, res) => {
  res.status(200).json(authService.getCurrentUser(req.user));
};

module.exports = {
  getCurrentUser,
  login
};
