const express = require("express");

const programController = require("../controllers/programController");
const authenticate = require("../middlewares/authenticate");

const router = express.Router();

router.get("/manage", authenticate, programController.getAllPrograms);
router.post("/", authenticate, programController.createProgram);
router.put("/:programId", authenticate, programController.updateProgram);
router.get("/", programController.getPrograms);

module.exports = router;
