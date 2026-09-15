const express = require("express");
const {
  register,
  verifyOTP,
  resendOTP,
  login,
  forgotPassword,
  resetPassword,
  getMe,
  getProfile,
  updateProfile,
  changePassword,
  logout,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const { uploadProfilePhoto } = require("../middleware/upload");

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Protected routes
router.get("/me", protect, getMe);
router.get("/profile", protect, getProfile);
router.put(
  "/profile",
  protect,
  uploadProfilePhoto.single("profilePhoto"),
  updateProfile,
);
router.patch(
  "/profile",
  protect,
  uploadProfilePhoto.single("profilePhoto"),
  updateProfile,
);
router.put("/change-password", protect, changePassword);
router.patch("/change-password", protect, changePassword);
router.post("/logout", protect, logout);

module.exports = router;
