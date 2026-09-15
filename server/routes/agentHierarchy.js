const express = require("express");
const agentHierarchyController = require("../controllers/agentHierarchyController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// All routes protected
router.use(protect);

// Get complete hierarchy (agents with permissions)
router.get(
  "/complete",
  authorize("master_agent", "agent", "sub_agent"),
  agentHierarchyController.getCompleteHierarchy,
);

module.exports = router;
