const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const { uploadEmployee } = require("../middleware/uploadMiddleware");
router.post("/login", authController.login);
router.post("/activity", authMiddleware, authController.recordActivity);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.get("/me", authMiddleware, authController.me);
router.post("/logout", authMiddleware, authController.logout);
router.post(
  "/employees",
  authMiddleware,
  adminMiddleware,
  uploadEmployee.fields([
    { name: "photo", maxCount: 1 },
    { name: "ktp", maxCount: 1 },
    { name: "npwp", maxCount: 1 },
    { name: "bpjs_kesehatan", maxCount: 1 },
    { name: "bpjs_tk", maxCount: 1 },
    { name: "kk", maxCount: 1 },
  ]),
  authController.createEmployee,
);

router.get(
  "/employees",
  authMiddleware,
  adminMiddleware,
  authController.getEmployees,
);

router.get("/roles", authMiddleware, adminMiddleware, authController.getRoles);

router.put(
  "/employees/:id",
  authMiddleware,
  adminMiddleware,
  uploadEmployee.fields([
    { name: "photo", maxCount: 1 },
    { name: "ktp", maxCount: 1 },
    { name: "npwp", maxCount: 1 },
    { name: "bpjs_kesehatan", maxCount: 1 },
    { name: "bpjs_tk", maxCount: 1 },
    { name: "kk", maxCount: 1 },
  ]),
  authController.updateEmployee,
);

router.patch(
  "/employees/:id/deactivate",
  authMiddleware,
  adminMiddleware,
  authController.deactivateEmployee,
);

router.patch(
  "/employees/:id/activate",
  authMiddleware,
  adminMiddleware,
  authController.activateEmployee,
);

router.get(
  "/face-enrollment-status",
  authMiddleware,
  authController.getFaceEnrollmentStatus,
);

router.get(
  "/employees/:nip/job-descriptions",
  authMiddleware,
  adminMiddleware,
  authController.getEmployeeJobDescriptions,
);

router.post(
  "/employees/:nip/job-descriptions",
  authMiddleware,
  adminMiddleware,
  authController.createEmployeeJobDescription,
);

module.exports = router;
