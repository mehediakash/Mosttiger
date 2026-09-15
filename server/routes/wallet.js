const express = require("express");
const {
  getWalletBalance,
  getTransactionHistory,
  transferBetweenWallets,
  getWalletSummary,
  getActiveBonus,
} = require("../controllers/walletController");

const { protect } = require("../middleware/auth");

const router = express.Router();

router.get("/balance", protect, getWalletBalance);
router.get("/transactions", protect, getTransactionHistory);
router.post("/transfer", protect, transferBetweenWallets);
router.get("/summary", protect, getWalletSummary);
router.get("/active-bonus", protect, getActiveBonus);

module.exports = router;
