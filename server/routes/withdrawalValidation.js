const express = require("express");
const {
  checkWithdrawalEligibility,
  getAvailableBalance,
  validateWithdrawal,
  adminCheckWithdrawalLock,
  adminCheckUserBalance,
} = require("../controllers/withdrawalValidationController");

const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// User routes (protected)
router.get("/check-eligibility", protect, checkWithdrawalEligibility);
router.get("/available-balance", protect, getAvailableBalance);
router.post("/validate", protect, validateWithdrawal);

// Admin routes (protected + admin only)
router.get(
  "/admin/user/:userId/lock-status",
  protect,
  authorize("admin"),
  adminCheckWithdrawalLock,
);
router.get(
  "/admin/user/:userId/balance",
  protect,
  authorize("admin"),
  adminCheckUserBalance,
);

module.exports = router;
