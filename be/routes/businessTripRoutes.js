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
// BUSINESS TRIP DASHBOARD
// ======================================

router.get("/dashboard/summary", auth, dashboardController.getDashboardSummary);

router.get("/history/me", auth, dashboardController.getMyTripHistory);

// ======================================
// MANAGER / SUPERVISOR APPROVAL
// ======================================

router.get("/approvals/manager", auth, approvalController.getManagerApprovals);

router.post(
  "/approvals/:id/manager-action",
  auth,
  approvalController.managerAction,
);

// ======================================
// HR APPROVAL
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
// DIRECTOR APPROVAL
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

// ======================================
// APPROVAL DETAIL
// Route dinamis harus setelah route statis
// ======================================

router.get("/approvals/:id", auth, approvalController.getApprovalDetail);

// ======================================
// FINANCE - DISBURSEMENT
// ======================================

router.get("/approvals/finance/queue", auth, financeController.getFinanceQueue);

router.get(
  "/finance/settlements",
  auth,
  settlementController.getFinanceSettlementQueue,
);

router.get(
  "/finance/settlements/:id",
  auth,
  settlementController.getFinanceSettlementDetail,
);

router.post(
  "/finance/settlements/:id/verify",
  auth,
  settlementController.verifySettlement,
);

// ======================================
// FINANCE - BALANCE
// ======================================

router.get("/finance/balances", auth, balanceController.getAllBalances);

router.get(
  "/finance/balances/:employeeId",
  auth,
  balanceController.getEmployeeBalanceDetail,
);

// ======================================
// FINANCE - DETAIL & DISBURSEMENT
// ======================================

router.get("/finance/:id", auth, financeController.getFinanceDetail);

router.post("/finance/:id/disburse", auth, financeController.disburse);

// ======================================
// EMPLOYEE - SETTLEMENT
// ======================================

router.post("/:id/settlement", auth, settlementController.submitSettlement);

// ======================================
// BUSINESS TRIP ATTACHMENTS
// ======================================

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

// ======================================
// EMPLOYEE - BALANCE
// ======================================

router.get("/balance/me", auth, balanceController.getMyBalance);

// ======================================
// EMPLOYEE - CANCELLATION
// ======================================

router.post(
  "/:id/cancellation",
  auth,
  cancellationController.requestCancellation,
);

// ======================================
// MANAGER / SUPERVISOR - CANCELLATION
// ======================================

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

// ======================================
// HR - CANCELLATION
// ======================================

router.get("/cancellations/hr", auth, cancellationController.getHRQueue);

router.post(
  "/cancellations/:id/hr-action",
  auth,
  cancellationController.hrAction,
);

// ======================================
// FINANCE - REFUND
// ======================================

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
