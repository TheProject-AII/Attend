const express = require("express");
const router = express.Router();

const payrollController = require("../controllers/payrollController");
const authMiddleware = require("../middleware/authMiddleware");

// Semua endpoint payroll wajib login.
router.use(authMiddleware);

router.get("/employees", payrollController.getEmployees);
router.post("/salary", payrollController.saveSalary);

// Payroll Period
router.get("/periods", payrollController.getPeriods);
router.post("/periods", payrollController.createPeriod);
router.post("/periods/:periodId/generate", payrollController.generatePayroll);
router.get("/periods/:periodId/details", payrollController.getPayrollDetails);

router.put(
  "/periods/:periodId/details/:detailId",
  payrollController.updatePayrollDetails,
);

// Approval HR -> Finance
router.post(
  "/periods/:periodId/submit",
  payrollController.submitPayrollApproval,
);

// Approval Finance -> Director -> Final
router.post("/periods/:periodId/approve", payrollController.approvePayroll);

// Reject Finance / Director
router.post("/periods/:periodId/reject", payrollController.rejectPayroll);

module.exports = router;
