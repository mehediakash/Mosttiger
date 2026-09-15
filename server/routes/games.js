const express = require("express");
const {
  getGames,
  getGameCategories,
  getProviders,
  getGameById,
  launchGame,
  handleGameCallback,
  getGameHistory,
  getActiveSessions,
  closeGameSession,
  closeAllGameSessions,
  getAdminProvidersList,
  getAdminCategoriesList,
  getPromotionFormData,
} = require("../controllers/gameController");

const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// Game management routes
router.get("/", getGames);
router.get("/providers", getProviders);
router.get("/categories", getGameCategories);
router.get("/history", protect, getGameHistory);
router.get("/active-sessions", protect, getActiveSessions);
router.post("/launch/:gameId", protect, launchGame);
router.post("/close-session", protect, closeGameSession);
router.post("/close-all-sessions", protect, closeAllGameSessions);

// Admin promotion system routes
router.get(
  "/admin/promotion-data",
  protect,
  authorize("admin"),
  getPromotionFormData,
);
router.get(
  "/admin/providers-list",
  protect,
  authorize("admin"),
  getAdminProvidersList,
);
router.get(
  "/admin/categories-list",
  protect,
  authorize("admin"),
  getAdminCategoriesList,
);

// Game callback (public route for provider callbacks)
router.post("/callback", handleGameCallback);

// Dynamic game lookup (keep last to avoid catching reserved paths)
router.get("/:id", protect, getGameById);

module.exports = router;
