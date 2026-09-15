const express = require("express");
const router = express.Router();
const turnoverController = require("../controllers/turnoverController");
const { protect } = require("../middleware/auth");

// All routes require authentication
router.use(protect);

// Record turnover when a bet is placed
router.post("/record", turnoverController.recordTurnover);

// Update turnover status when bet status changes
router.put("/update-status", turnoverController.updateTurnoverStatus);

// Get user total turnover
router.get("/user/:userId", turnoverController.getUserTurnover);

// Get agent team turnover
router.get("/agent/:agentId", turnoverController.getAgentTeamTurnover);

// Get platform-wide statistics
router.get("/stats/platform", turnoverController.getPlatformTurnoverStats);

// Get top active users by turnover
router.get("/top/users", turnoverController.getTopUsersByTurnover);

// Get top agents by team turnover
router.get("/top/agents", turnoverController.getTopAgentsByTeamTurnover);

// Get filtered turnover data
router.get("/filtered/data", turnoverController.getFilteredTurnoverData);

// Get users with turnover column data
router.get("/users/list", turnoverController.getUsersWithTurnover);

module.exports = router;
