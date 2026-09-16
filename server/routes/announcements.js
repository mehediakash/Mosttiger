const express = require("express");
const router = express.Router();
const {
  getActiveAnnouncements,
} = require("../controllers/announcementController");

// Public route for frontend NewsTicker
router.get("/active", getActiveAnnouncements);
router.get("/", getActiveAnnouncements);

module.exports = router;
