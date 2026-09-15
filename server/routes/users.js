const express = require("express");
const {
  getProfile,
  updateProfile,
  changePassword,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const { uploadProfilePhoto } = require("../middleware/upload");

const router = express.Router();

router.get("/profile", protect, getProfile);
router.patch(
  "/profile",
  protect,
  uploadProfilePhoto.single("profilePhoto"),
  updateProfile,
);
router.patch("/change-password", protect, changePassword);

module.exports = router;
