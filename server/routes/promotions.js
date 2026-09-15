const express = require("express");
const {
  createPromotion,
  getAllPromotions,
  getPromotionById,
  updatePromotion,
  deletePromotion,
  activatePromotion,
  deactivatePromotion,
  applyPromotionToDeposit,
  checkUserWithdrawalLock,
} = require("../controllers/promotionController");

const { protect, authorize } = require("../middleware/auth");
const { singleCloudinaryImage } = require("../middleware/cloudinaryUpload");

const router = express.Router();

// All routes protected and admin only
router.use(protect);
router.use(authorize("admin"));

// Create promotion
router.post("/", singleCloudinaryImage("image"), createPromotion);

// Get all promotions
router.get("/", getAllPromotions);

// Get promotion by ID
router.get("/:id", getPromotionById);

// Update promotion
router.put("/:id", singleCloudinaryImage("image"), updatePromotion);

// Delete promotion
router.delete("/:id", deletePromotion);

// Activate promotion
router.put("/:id/activate", activatePromotion);

// Deactivate promotion
router.put("/:id/deactivate", deactivatePromotion);

// Apply promotion to deposit (manual apply)
router.post("/:promotionId/apply", applyPromotionToDeposit);

// Check user's withdrawal lock status
router.get("/user/:userId/withdrawal-lock", checkUserWithdrawalLock);

module.exports = router;
