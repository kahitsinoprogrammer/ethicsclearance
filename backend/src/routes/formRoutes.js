const express = require("express");

const formApplicationController = require("../controllers/formApplicationController");
const formController = require("../controllers/formController");
const authenticate = require("../middlewares/authenticate");

const router = express.Router();

router.get("/manage", authenticate, formController.getAllForms);
router.post("/", authenticate, formController.createForm);
router.get(
  "/:formId/application-template",
  authenticate,
  formApplicationController.getFormApplicationTemplate
);
router.post(
  "/:formId/applications",
  authenticate,
  formApplicationController.createFormApplication
);
router.get("/:formId", authenticate, formController.getFormById);
router.put("/:formId", authenticate, formController.updateForm);

module.exports = router;
