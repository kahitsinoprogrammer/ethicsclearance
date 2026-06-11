const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const passport = require("passport");

const env = require("./config/env");
const configurePassport = require("./config/passport");
const routes = require("./routes");
const notFound = require("./middlewares/notFound");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

configurePassport(passport);

const corsOptions = env.clientUrl
  ? {
      origin: env.clientUrl,
      credentials: true,
      exposedHeaders: ["Content-Disposition", "Content-Type"]
    }
  : {
      origin: true,
      credentials: true,
      exposedHeaders: ["Content-Disposition", "Content-Type"]
    };

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(passport.initialize());

app.get("/", (_req, res) => {
  res.json({
    message: "Backend is running.",
    docs: "Use /api/health to test the API."
  });
});

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
