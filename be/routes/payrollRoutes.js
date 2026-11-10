const express = require("express");
const router = express.Router();

const payrollController = require("../controllers/payrollController");

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
module.exports = router;
