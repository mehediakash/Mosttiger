const express = require("express");
const referralController = require("../controllers/referralController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/dashboard", referralController.getMyReferralDashboard);
router.get("/statistics", referralController.getMyReferralStatistics);
router.get("/list", referralController.getMyReferralList);
router.get("/pending-bonus", referralController.getMyPendingBonuses);
router.get("/qualified", referralController.getMyQualifiedReferrals);
router.post("/bonuses/:bonusId/claim", referralController.claimReferralBonus);
router.get("/bonus/status", referralController.getReferralBonusStatus);
router.get("/bonus/history", referralController.getReferralBonusHistory);
router.get("/turnover", referralController.getReferralTurnover);
router.get("/:relationshipId", referralController.getMyReferralDetails);

module.exports = router;
