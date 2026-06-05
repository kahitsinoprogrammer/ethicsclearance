const express = require("express");

const authController = require("../controllers/authController");
const authenticate = require("../middlewares/authenticate");
const rejectAuthenticated = require("../middlewares/rejectAuthenticated");

const router = express.Router();

router.post("/login", rejectAuthenticated, authController.login);
router.get("/me", authenticate, authController.getCurrentUser);

module.exports = router;
