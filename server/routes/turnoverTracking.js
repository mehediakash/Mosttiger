const express = require("express");
const {
  recordBet,
  getTurnoverStatus,
  getAdminUserTurnoverStatus,
  cancelTurnover,
  expireTurnovers,
  completeTurnoverAdmin,
} = require("../controllers/turnoverTrackingController");

const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// User routes (protected)
router.post("/record-bet", protect, recordBet);
router.get("/status", protect, getTurnoverStatus);

// Admin routes (protected + admin only)
router.get(
  "/admin/user/:userId",
  protect,
  authorize("admin"),
  getAdminUserTurnoverStatus,
);
router.put(
  "/admin/:turnoverId/cancel",
  protect,
  authorize("admin"),
  cancelTurnover,
);
router.put(
  "/admin/:turnoverId/complete",
  protect,
  authorize("admin"),
  completeTurnoverAdmin,
);
router.post("/admin/expire", protect, authorize("admin"), expireTurnovers);

module.exports = router;
