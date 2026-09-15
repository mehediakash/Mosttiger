const express = require("express");
const agentBalanceController = require("../controllers/agentBalanceController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

router.get(
  "/my-wallet",
  authorize("master_agent", "agent", "sub_agent"),
  agentBalanceController.getMyWalletBalance,
);
router.get(
  "/my-transactions",
  authorize("master_agent", "agent", "sub_agent"),
  agentBalanceController.getMyTransactions,
);
router.post(
  "/deduct-user",
  authorize("master_agent", "agent", "sub_agent"),
  agentBalanceController.deductUserBalance,
);
router.post(
  "/transfer-sub-agent",
  authorize("master_agent", "agent"),
  agentBalanceController.transferToSubAgent,
);

module.exports = router;
