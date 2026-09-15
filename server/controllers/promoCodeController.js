const promoCodeService = require("../services/promoCodeService");
const PromoCode = require("../models/PromoCode");

// @desc    Get all active promo codes for public display
// @route   GET /api/promos
// @access  Public
exports.getActivePromoCodes = async (req, res) => {
  try {
    const now = new Date();

    const promoCodes = await PromoCode.find({
      isActive: true,
      $or: [
        { validUntil: { $exists: false } },
        { validUntil: null },
        { validUntil: { $gte: now } },
      ],
    })
      .select(
        "code name description type bonusAmount percentage minDeposit maxBonus turnoverRequirement validUntil newUsersOnly walletType",
      )
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(); // Reduce memory usage by ~40%

    res.status(200).json({
      success: true,
      data: promoCodes,
    });
  } catch (error) {
    console.error("Get active promo codes error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching promo codes",
    });
  }
};

// @desc    Apply promo code
// @route   POST /api/promo-codes/apply
// @access  Private
exports.applyPromoCode = async (req, res) => {
  try {
    const { code, depositAmount = 0 } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Promo code is required",
      });
    }

    const result = await promoCodeService.applyPromoCode(
      req.user.id,
      code,
      depositAmount,
    );

    res.status(200).json({
      success: true,
      message: "Promo code applied successfully",
      data: result,
    });
  } catch (error) {
    console.error("Apply promo code error:", error);

    // Check if it's a validation error that should be shown to user
    if (
      error.message.includes("Invalid promo code") ||
      error.message.includes("not available") ||
      error.message.includes("already used") ||
      error.message.includes("expired") ||
      error.message.includes("Minimum deposit") ||
      error.message.includes("not active") ||
      error.message.includes("new users only")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error while applying promo code",
    });
  }
};

// @desc    Get user's active promo codes
// @route   GET /api/promo-codes/my-codes
// @access  Private
exports.getMyPromoCodes = async (req, res) => {
  try {
    const activePromos = await promoCodeService.getUserActivePromoCodes(
      req.user.id,
    );

    res.status(200).json({
      success: true,
      data: activePromos,
    });
  } catch (error) {
    console.error("Get user promo codes error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching promo codes",
    });
  }
};

// @desc    Get promo code details
// @route   GET /api/promo-codes/:code
// @access  Private
exports.getPromoCodeDetails = async (req, res) => {
  try {
    const { code } = req.params;

    const promoCode = await PromoCode.findOne({
      code: code.toUpperCase(),
      isActive: true,
    }).lean(); // Reduce memory usage

    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: "Promo code not found",
      });
    }

    // Don't send sensitive information
    const publicInfo = {
      code: promoCode.code,
      name: promoCode.name,
      description: promoCode.description,
      type: promoCode.type,
      bonusAmount: promoCode.bonusAmount,
      percentage: promoCode.percentage,
      minDeposit: promoCode.minDeposit,
      maxBonus: promoCode.maxBonus,
      turnoverRequirement: promoCode.turnoverRequirement,
      validUntil: promoCode.validUntil,
    };

    res.status(200).json({
      success: true,
      data: publicInfo,
    });
  } catch (error) {
    console.error("Get promo code details error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching promo code details",
    });
  }
};

// @desc    Get promo code analytics (Admin only)
// @route   GET /api/admin/promo-codes/:id/analytics
// @access  Private (Admin only)
exports.getPromoCodeAnalytics = async (req, res) => {
  try {
    const { id } = req.params;

    const analytics = await promoCodeService.getPromoCodeAnalytics(id);

    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error("Get promo code analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching promo code analytics",
    });
  }
};

// @desc    Validate promo code for registration
// @route   POST /api/promo/validate
// @access  Public
exports.validatePromoCode = async (req, res) => {
  try {
    const { promoCode } = req.body;

    if (!promoCode) {
      return res.status(400).json({
        success: false,
        message: "Promo code is required",
      });
    }

    const promo = await PromoCode.findOne({
      code: promoCode.toUpperCase(),
      isActive: true,
    });

    if (!promo) {
      return res.status(400).json({
        success: false,
        message: "Invalid promo code",
      });
    }

    // Check if expired
    if (promo.validUntil && new Date() > new Date(promo.validUntil)) {
      return res.status(400).json({
        success: false,
        message: "This promo code has expired",
      });
    }

    // Return validation success with promo details
    res.status(200).json({
      success: true,
      isValid: true,
      promoName: promo.name,
      bonusPercentage: promo.bonusPercentage || promo.percentage,
      bonusAmount: promo.maxBonus || promo.bonusAmount,
      message: `${promo.name} will be applied to your account`,
    });
  } catch (error) {
    console.error("Validate promo code error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while validating promo code",
    });
  }
};
