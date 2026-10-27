const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const controller = require("../controllers/lateCompensationController");
const settingsController = require("../controllers/lateCompensationSettingsController");
const exportController = require("../controllers/lateCompensationExportController");

// Karyawan: laporan milik sendiri
router.get("/my-summary", authMiddleware, controller.mySummary);

router.get("/my-history", authMiddleware, controller.myHistory);

// Admin / HR: seluruh karyawan
router.get("/employees", authMiddleware, adminMiddleware, controller.employees);

// Admin / HR: riwayat pembayaran
router.get("/payments", authMiddleware, adminMiddleware, controller.payments);

router.get(
  "/global-summary",
  authMiddleware,
  adminMiddleware,
  controller.globalSummary,
);

router.get(
  "/settings",
  authMiddleware,
  adminMiddleware,
  settingsController.getSettings,
);

router.put(
  "/settings",
  authMiddleware,
  adminMiddleware,
  settingsController.updateSettings,
);

router.get(
  "/export/excel",
  authMiddleware,
  adminMiddleware,
  exportController.exportExcel,
);
// Admin / HR: detail satu karyawan
router.get(
  "/employees/:id",
  authMiddleware,
  adminMiddleware,
  controller.employeeDetail,
);

module.exports = router;
