const express = require("express");
const agentDashboardController = require("../controllers/agentDashboardController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(protect);
router.use(authorize("master_agent", "agent", "sub_agent"));

router.get(
  "/overview",
  agentDashboardController.getAgentDashboard.bind(agentDashboardController),
);

module.exports = router;
