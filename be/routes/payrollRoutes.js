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

// Approval HR -> Finance -> Director
router.post(
  "/periods/:periodId/submit",
  payrollController.submitPayrollApproval,
);
router.post("/periods/:periodId/approve", payrollController.approvePayroll);
router.post("/periods/:periodId/reject", payrollController.rejectPayroll);

// Pay Slip Request - Employee
router.get(
  "/pay-slip/available-periods",
  payrollController.getAvailablePaySlipPeriods,
);
router.get("/pay-slip/my-requests", payrollController.getMyPaySlipRequests);
router.post("/pay-slip/requests", payrollController.createPaySlipRequest);
router.get(
  "/pay-slip/requests/:requestId/download",
  payrollController.downloadPaySlip,
);

// Pay Slip Request - HR
router.get("/pay-slip/requests", payrollController.getAllPaySlipRequests);
router.patch(
  "/pay-slip/requests/:requestId",
  payrollController.updatePaySlipRequest,
);
router.post(
  "/pay-slip/requests/:requestId/send",
  payrollController.sendPaySlip,
);

module.exports = router;
