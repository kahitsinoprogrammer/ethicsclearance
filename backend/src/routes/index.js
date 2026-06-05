const express = require("express");

const authRoutes = require("./authRoutes");
const formApplicationRoutes = require("./formApplicationRoutes");
const formRoutes = require("./formRoutes");
const healthRoutes = require("./healthRoutes");
const programRoutes = require("./programRoutes");
const userRoutes = require("./userRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/applications", formApplicationRoutes);
router.use("/forms", formRoutes);
router.use("/health", healthRoutes);
router.use("/programs", programRoutes);
router.use("/users", userRoutes);

module.exports = router;
