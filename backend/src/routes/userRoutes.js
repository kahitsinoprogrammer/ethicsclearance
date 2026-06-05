const express = require("express");

const userController = require("../controllers/userController");
const authenticate = require("../middlewares/authenticate");
const optionalAuthenticate = require("../middlewares/optionalAuthenticate");

const router = express.Router();

router.post("/register", optionalAuthenticate, userController.registerUser);
router.post(
  "/resend-email-verification-otp",
  userController.resendEmailVerificationOtp
);
router.post(
  "/verify-email-verification-otp",
  userController.verifyEmailVerificationOtp
);
router.get("/roles", authenticate, userController.getRoles);
router.get("/", authenticate, userController.getUsers);
router.get("/:userId/roles", authenticate, userController.getUserRoles);
router.put("/:userId", authenticate, userController.updateUser);

module.exports = router;
