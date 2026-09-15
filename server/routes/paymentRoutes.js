const express = require("express");

const {
  getDepositMethods,
  createDeposit,
  getDepositHistory,
  getDepositDetails,
  cancelDeposit,
} = require("../controllers/depositController");

const {
  getWithdrawalMethods,
  createWithdrawal,
  getWithdrawalHistory,
  getWithdrawalDetails,
  cancelWithdrawal,
} = require("../controllers/withdrawalController");

const {
  createPaymentController,
  verifyPaymentController,
  handlePaymentWebhookController,
  cancelPaymentController,
} = require("../controllers/paymentController");

const { protect } = require("../middleware/auth");
const { uploadDepositProof } = require("../middleware/upload");

const router = express.Router();

router.get("/deposit-methods", protect, getDepositMethods);
router.post(
  "/deposit",
  protect,
  uploadDepositProof.single("proofImage"),
  createDeposit,
);
router.post(
  "/deposit-methods",
  protect,
  uploadDepositProof.single("proofImage"),
  createDeposit,
);
router.get("/deposits", protect, getDepositHistory);
router.get("/deposits/:id", protect, getDepositDetails);
router.put("/deposits/:id/cancel", protect, cancelDeposit);

// New: cancel payment/deposit by body id (depositId or id)
router.post("/cancel", protect, cancelPaymentController);

router.post("/create", protect, createPaymentController);
router.post("/verify", protect, verifyPaymentController);
router.post("/webhook", handlePaymentWebhookController);

router.get("/withdrawal-methods", protect, getWithdrawalMethods);
router.post("/withdraw", protect, createWithdrawal);
router.get("/withdrawals", protect, getWithdrawalHistory);
router.get("/withdrawals/:id", protect, getWithdrawalDetails);
router.put("/withdrawals/:id/cancel", protect, cancelWithdrawal);

module.exports = router;
