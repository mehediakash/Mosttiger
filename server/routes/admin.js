const express = require("express");
const {
  getDashboard,
  getFinancialReport,
  getUsers,
  getUser,
  updateUser,
  updateUserStatus,
  adjustUserBalance,
  getPendingTransactions,
  approveTransaction,
  rejectTransaction,
  createPromoCode,
  getPromoCodes,
  updatePromoCode,
  deletePromoCode,
  getSystemHealth,
  getAgents,
  updateAgentCommission,
  getGamingAnalytics,
  getSportsAnalytics,
  getAdminHierarchy,
} = require("../controllers/adminController");

const adminManagementController = require("../controllers/adminManagementController");
const adminBetsController = require("../controllers/adminBetsController");

const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// All routes protected and admin only
router.use(protect);
router.use(authorize("admin"));

// Dashboard & Reports
router.get("/dashboard", getDashboard);
router.get("/reports/financial", getFinancialReport);
router.get("/analytics/gaming", getGamingAnalytics);
router.get("/analytics/sports", getSportsAnalytics);
router.get("/bets", adminBetsController.getAdminBets);

// User Management
router.get("/users", getUsers);
router.get("/users/:id", getUser);
router.put("/users/:id", updateUser);
router.put("/users/:id/status", updateUserStatus);
router.post("/users/:id/adjust-balance", adjustUserBalance);

// Transaction Management
router.get("/transactions/pending", getPendingTransactions);
router.put("/transactions/:type/:id/approve", approveTransaction);
router.put("/transactions/:type/:id/reject", rejectTransaction);

// Agent Management
router.get("/agents", getAgents);
router.get("/hierarchy", getAdminHierarchy);
router.put("/agents/:id/commission", updateAgentCommission);

// Promo Code Management
router.get("/promo-codes", getPromoCodes);
router.post("/promo-codes", createPromoCode);
router.put("/promo-codes/:id", updatePromoCode);
router.delete("/promo-codes/:id", deletePromoCode);

// System Management
router.get("/system-health", getSystemHealth);

// Permission Templates
router.get(
  "/permissions/templates",
  adminManagementController.getPermissionTemplates,
);
router.post(
  "/permissions/templates",
  adminManagementController.createPermissionTemplate,
);
router.put(
  "/permissions/templates/:templateId",
  adminManagementController.updatePermissionTemplate,
);
router.delete(
  "/permissions/templates/:templateId",
  adminManagementController.deletePermissionTemplate,
);

// Create agent with permissions
router.post(
  "/agents/create-with-permissions",
  adminManagementController.createAgentWithPermissions,
);

module.exports = router;
