const express = require("express");
const { protect } = require("../middleware/auth");
const { getWalletTransactions } = require("../controllers/walletController");

const router = express.Router();

router.get("/", protect, getWalletTransactions);

module.exports = router;
