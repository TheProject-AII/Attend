const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const controller = require("../controllers/settingsController");

// router.get("/overtime", auth, controller.getOvertimeSettings);
// router.patch("/overtime", auth, controller.updateOvertimeSettings);

// WORKING HOURS SETTINGS
router.get("/working-hours", auth, controller.getWorkingHoursSettings);

module.exports = router;
