const passport = require("passport");

const optionalAuthenticate = (req, res, next) => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader) {
    req.user = null;
    return next();
  }

  return passport.authenticate("jwt", { session: false }, (error, user) => {
    if (error) {
      return next(error);
    }

    if (!user) {
      const authError = new Error("Authentication is required.");
      authError.statusCode = 401;
      return next(authError);
    }

    req.user = user;
    return next();
  })(req, res, next);
};

module.exports = optionalAuthenticate;
