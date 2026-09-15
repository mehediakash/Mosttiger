const express = require("express");
const {
  startFreeSpinSession,
  completeFreeSpinSession,
  cancelFreeSpinSession,
  getUserActiveSessions,
  expireSessions,
} = require("../controllers/freeSpinController");

const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// User routes (protected)
router.post("/start", protect, startFreeSpinSession);
router.get("/active", protect, getUserActiveSessions);
router.post("/:sessionId/complete", protect, completeFreeSpinSession);
router.post("/:sessionId/cancel", protect, cancelFreeSpinSession);

// Admin routes (protected + admin only)
router.post("/admin/expire", protect, authorize("admin"), expireSessions);

module.exports = router;
