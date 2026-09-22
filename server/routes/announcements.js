const express = require("express");
const router = express.Router();
const {
  getActiveAnnouncements,
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  toggleAnnouncementStatus,
} = require("../controllers/announcementController");
const { protect, authorize } = require("../middleware/auth");

// Public route for frontend NewsTicker
router.get("/active", getActiveAnnouncements);
router.get("/", getActiveAnnouncements);

router.use(protect, authorize("admin"));
router.get("/admin", getAllAnnouncements);
router.post("/admin", createAnnouncement);
router.put("/admin/:id", updateAnnouncement);
router.delete("/admin/:id", deleteAnnouncement);
router.patch("/admin/:id/status", toggleAnnouncementStatus);

module.exports = router;
