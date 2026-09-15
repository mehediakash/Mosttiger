const express = require("express");
const adminReferralController = require("../controllers/adminReferralController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(protect);
router.use(authorize("admin"));

router.get("/config", adminReferralController.getConfig);
router.put("/config", adminReferralController.updateConfig);
router.get("/analytics", adminReferralController.getAnalytics);
router.get("/history", adminReferralController.getHistory);
router.get("/history/:relationshipId", adminReferralController.getHistoryDetails);
router.get("/pending-claims", adminReferralController.getPendingClaims);

module.exports = router;
