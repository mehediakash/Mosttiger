const express = require("express");
const Promotion = require("../models/Promotion");
const promotionService = require("../services/promotionService");
const { optionalAuth } = require("../middleware/auth");

const router = express.Router();

// Public route: list active promotions
// GET /api/promotions
router.get("/", optionalAuth, async (req, res) => {
  try {
    const { status = "active", limit = 50 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    // Exclude expired promotions unless explicitly requested
    filter.$or = [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }];

    const promotions = await Promotion.find(filter)
      .select(
        "title shortDescription fullDescription imageUrl promoCode type allowedCategories freeSpinConfig bonusConfig expiresAt isLifetime newUserOnly firstDepositOnly maxUsagePerUser",
      )
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10));

    const decorated = [];
    for (const promotion of promotions) {
      const eligibility = req.user
        ? await promotionService.validatePromotionEligibility(
            req.user.id,
            promotion,
          )
        : {
            isEligible: !promotion.newUserOnly && !promotion.firstDepositOnly,
            alreadyUsed: false,
          };

      if (
        (promotion.newUserOnly || promotion.firstDepositOnly) &&
        !eligibility.isEligible
      ) {
        continue;
      }

      decorated.push({
        ...promotion.toObject(),
        isEligible: eligibility.isEligible,
        alreadyUsed: eligibility.alreadyUsed,
      });
    }

    return res.status(200).json({ success: true, data: decorated });
  } catch (err) {
    console.error("Public promotions error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load promotions" });
  }
});

module.exports = router;
