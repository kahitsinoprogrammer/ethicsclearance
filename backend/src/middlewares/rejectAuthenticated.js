const passport = require("passport");

const createAlreadyAuthenticatedError = () => {
  const error = new Error("You are already logged in.");
  error.statusCode = 403;
  return error;
};

const rejectAuthenticated = (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (authError, user) => {
    if (authError) {
      return next(authError);
    }

    if (user) {
      return next(createAlreadyAuthenticatedError());
    }

    return next();
  })(req, res, next);
};

module.exports = rejectAuthenticated;
