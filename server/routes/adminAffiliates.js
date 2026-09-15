const express = require("express");
const adminAffiliateController = require("../controllers/adminAffiliateController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(protect);
router.use(authorize("admin"));

router.get("/applications", adminAffiliateController.getApplications);
router.get(
  "/applications/:applicationId",
  adminAffiliateController.getApplicationDetails,
);
router.patch(
  "/applications/:applicationId/approve",
  adminAffiliateController.approveApplication,
);
router.patch(
  "/applications/:applicationId/reject",
  adminAffiliateController.rejectApplication,
);

router.post("/settlements/run-due", adminAffiliateController.runDueSettlements);
router.get("/withdrawals", adminAffiliateController.getWithdrawals);
router.patch(
  "/withdrawals/:withdrawalId/approve",
  adminAffiliateController.approveWithdrawal,
);
router.patch(
  "/withdrawals/:withdrawalId/reject",
  adminAffiliateController.rejectWithdrawal,
);

router.patch("/:userId/suspend", adminAffiliateController.suspendAffiliate);
router.patch("/:userId/status", adminAffiliateController.updateAffiliateStatus);
router.get("/:userId/config", adminAffiliateController.getAffiliateConfig);
router.patch("/:userId/config", adminAffiliateController.updateAffiliateConfig);
router.post("/:userId/settlements/run", adminAffiliateController.runAffiliateSettlement);
router.post("/:userId/statistics/refresh", adminAffiliateController.refreshAffiliateStatistics);
router.get("/:userId/transactions", adminAffiliateController.getAffiliateTransactions);

module.exports = router;
