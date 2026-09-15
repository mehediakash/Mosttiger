const express = require("express");
const agentManagementController = require("../controllers/agentManagementController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// All routes protected
router.use(protect);

// Sub-agent management (Master Agent, Agent & Sub Agent)
router.post(
  "/sub-agents",
  authorize("master_agent", "agent", "sub_agent"),
  agentManagementController.createSubAgent.bind(agentManagementController),
);
router.get(
  "/sub-agents",
  authorize("master_agent", "agent", "sub_agent"),
  agentManagementController.getDownlineAgents.bind(agentManagementController),
);
router.put(
  "/sub-agents/:subAgentId/commission",
  authorize("master_agent", "agent", "sub_agent"),
  agentManagementController.updateSubAgentCommission.bind(
    agentManagementController,
  ),
);

// User management (All agents with permissions)
router.post(
  "/users/balance",
  authorize("master_agent", "agent", "sub_agent"),
  agentManagementController.addUserBalance.bind(agentManagementController),
);

// Permissions
router.get(
  "/permissions",
  authorize("master_agent", "agent", "sub_agent"),
  agentManagementController.getAgentPermissions.bind(agentManagementController),
);

module.exports = router;
