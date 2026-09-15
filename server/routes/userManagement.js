const express = require("express");
const userManagementController = require("../controllers/userManagementController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(protect);
router.use(authorize("master_agent", "agent", "sub_agent"));

// User CRUD operations
router.get("/users", userManagementController.getMyUsers);
router.post("/create-user", userManagementController.createUser);
router.put("/users/:userId", userManagementController.updateUser);
router.post("/reset-password", userManagementController.resetUserPassword);
router.post("/adjust-balance", userManagementController.adjustUserBalance);
router.get("/activity-logs", userManagementController.getUserActivityLogs);

module.exports = router;
