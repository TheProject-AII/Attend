const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");

const businessTripController = require("../controllers/businessTripController");
const approvalController = require("../controllers/businessTripApprovalController");
const administrativeApprovalController = require("../controllers/businessTripAdministrativeApprovalController");
const financeController = require("../controllers/businessTripFinanceController");
const settlementController = require("../controllers/businessTripSettlementController");
const uploadBusinessTrip = require("../middleware/uploadBusinessTrip");
const attachmentController = require("../controllers/businessTripAttachmentController");
const balanceController = require("../controllers/businessTripBalanceController");
const cancellationController = require("../controllers/businessTripCancellationController");
const dashboardController = require("../controllers/businessTripDashboardController");
// ======================================
// EMPLOYEE
// ======================================

router.get("/me/context", auth, businessTripController.getMyContext);

router.post("/", auth, businessTripController.create);

// ======================================
// MANAGER / SUPERVISOR
// ======================================

router.get("/approvals/manager", auth, approvalController.getManagerApprovals);

// ======================================
// FINANCE - DISBURSEMENT
// ======================================
// Business Trip Dashboard
router.get("/dashboard/summary", auth, dashboardController.getDashboardSummary);

// Employee: personal trip history
router.get("/history/me", auth, dashboardController.getMyTripHistory);
// Daftar pengajuan yang siap dicairkan
router.get("/approvals/finance/queue", auth, financeController.getFinanceQueue);
// Employee: mengajukan atau mengajukan ulang settlement
router.post("/:id/settlement", auth, settlementController.submitSettlement);

// Finance: antrean settlement
router.get(
  "/finance/settlements",
  auth,
  settlementController.getFinanceSettlementQueue,
);

// Finance: detail settlement
router.get(
  "/finance/settlements/:id",
  auth,
  settlementController.getFinanceSettlementDetail,
);

// Finance: verifikasi settlement
router.post(
  "/finance/settlements/:id/verify",
  auth,
  settlementController.verifySettlement,
);

// Finance: seluruh saldo outstanding
router.get("/finance/balances", auth, balanceController.getAllBalances);

// Finance: detail saldo per karyawan
router.get(
  "/finance/balances/:employeeId",
  auth,
  balanceController.getEmployeeBalanceDetail,
);
// Detail pencairan
router.get("/finance/:id", auth, financeController.getFinanceDetail);

// Proses pencairan 100%
router.post("/finance/:id/disburse", auth, financeController.disburse);

router.get("/approvals/:id", auth, approvalController.getApprovalDetail);

router.post(
  "/approvals/:id/manager-action",
  auth,
  approvalController.managerAction,
);

// ======================================
// HR
// ======================================

router.get(
  "/approvals/hr",
  auth,
  administrativeApprovalController.getHRApprovals,
);

router.post(
  "/approvals/:id/hr-action",
  auth,
  administrativeApprovalController.hrAction,
);

// ======================================
// DIRECTOR
// ======================================

router.get(
  "/approvals/director",
  auth,
  administrativeApprovalController.getDirectorApprovals,
);

router.post(
  "/approvals/:id/director-action",
  auth,
  administrativeApprovalController.directorAction,
);

// Business Trip Attachments
router.post(
  "/:id/attachments",
  auth,
  uploadBusinessTrip.array("files", 10),
  attachmentController.uploadAttachments,
);

router.get("/:id/attachments", auth, attachmentController.getAttachments);

router.get(
  "/attachments/:attachmentId/url",
  auth,
  attachmentController.getAttachmentUrl,
);

// Employee: saldo outstanding milik sendiri
router.get("/balance/me", auth, balanceController.getMyBalance);

// Employee: request cancellation
router.post(
  "/:id/cancellation",
  auth,
  cancellationController.requestCancellation,
);

// Manager/SPV: cancellation queue and approval
router.get(
  "/cancellations/manager",
  auth,
  cancellationController.getManagerQueue,
);

router.post(
  "/cancellations/:id/manager-action",
  auth,
  cancellationController.managerAction,
);

// HR: cancellation queue and approval
router.get("/cancellations/hr", auth, cancellationController.getHRQueue);

router.post(
  "/cancellations/:id/hr-action",
  auth,
  cancellationController.hrAction,
);

// Finance: refund queue and confirmation
router.get(
  "/cancellations/finance",
  auth,
  cancellationController.getFinanceQueue,
);

router.post(
  "/cancellations/:id/refund",
  auth,
  cancellationController.confirmRefund,
);

module.exports = router;
