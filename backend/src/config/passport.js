const { ExtractJwt, Strategy: JwtStrategy } = require("passport-jwt");

const env = require("./env");
const userModel = require("../models/userModel");

const configurePassport = (passport) => {
  passport.use(
    new JwtStrategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: env.jwtSecret
      },
      async (payload, done) => {
        try {
          const user = await userModel.findUserById(payload.sub);

          if (!user || !user.is_active || !user.is_verified) {
            return done(null, false);
          }

          return done(null, user);
        } catch (error) {
          return done(error, false);
        }
      }
    )
  );
};

module.exports = configurePassport;
