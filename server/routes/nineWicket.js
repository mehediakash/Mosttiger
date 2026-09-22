const express = require("express");
const { protect } = require("../middleware/auth");
const {
  launch,
  callback,
  settleSession,
  settleActiveSession,
  getActiveSession,
} = require("../controllers/nineWicketController");

const router = express.Router();

router.get("/active-session", protect, getActiveSession);
router.post("/launch", protect, launch);
router.post("/callback", callback);
router.post("/settle-active", protect, settleActiveSession);
router.post("/sessions/:sessionId/settle", protect, settleSession);

module.exports = router;
