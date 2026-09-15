const express = require("express");
const { protect } = require("../middleware/auth");
const {
  launch,
  callback,
  settleSession,
  settleActiveSession,
} = require("../controllers/nineWicketController");

const router = express.Router();

router.post("/launch", protect, launch);
router.post("/callback", callback);
router.post("/settle-active", protect, settleActiveSession);
router.post("/sessions/:sessionId/settle", protect, settleSession);

module.exports = router;
