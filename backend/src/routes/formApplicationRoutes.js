const express = require("express");

const formApplicationController = require("../controllers/formApplicationController");
const authenticate = require("../middlewares/authenticate");

const router = express.Router();

router.get("/", authenticate, formApplicationController.listFormApplications);
router.get(
  "/for-signature",
  authenticate,
  formApplicationController.listApplicationsForSignature
);
router.get("/my", authenticate, formApplicationController.listMyFormApplications);
router.get(
  "/:applicationId",
  authenticate,
  formApplicationController.getFormApplicationDetails
);
router.get(
  "/:applicationId/report",
  authenticate,
  formApplicationController.downloadApplicationReport
);
router.get(
  "/:applicationId/certificate",
  authenticate,
  formApplicationController.downloadApplicationReport
);
router.put(
  "/:applicationId/answers",
  authenticate,
  formApplicationController.updateApplicationAnswers
);
router.put(
  "/:applicationId/signatories",
  authenticate,
  formApplicationController.updateApplicationSignatories
);
router.post(
  "/:applicationId/withdraw",
  authenticate,
  formApplicationController.withdrawApplication
);
router.post(
  "/:applicationId/signatories/:applicationSignatoryId/approve",
  authenticate,
  formApplicationController.approveApplicationSignatory
);
router.post(
  "/:applicationId/signatories/:applicationSignatoryId/reject",
  authenticate,
  formApplicationController.rejectApplicationSignatory
);

module.exports = router;
