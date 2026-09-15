const express = require("express");
const affiliateController = require("../controllers/affiliateController");
const { protect } = require("../middleware/auth");
const { requireApprovedAffiliate } = require("../middleware/affiliateAuth");

const router = express.Router();

router.get("/track/:code", affiliateController.trackAffiliateClick);

router.use(protect);

router.post("/apply", affiliateController.applyAffiliate);
router.get("/status", affiliateController.getMyAffiliateStatus);
router.get(
  "/profile",
  requireApprovedAffiliate,
  affiliateController.getMyAffiliateProfile,
);
router.get(
  "/players",
  requireApprovedAffiliate,
  affiliateController.getMyAffiliatePlayers,
);
router.get(
  "/statistics",
  requireApprovedAffiliate,
  affiliateController.getMyAffiliateStatistics,
);
router.get(
  "/transactions",
  requireApprovedAffiliate,
  affiliateController.getMyAffiliateTransactions,
);
router.post(
  "/withdrawals",
  requireApprovedAffiliate,
  affiliateController.requestAffiliateWithdrawal,
);
router.get(
  "/withdrawals",
  requireApprovedAffiliate,
  affiliateController.getMyAffiliateWithdrawals,
);

module.exports = router;
