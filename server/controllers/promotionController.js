const Promotion = require("../models/Promotion");
const promotionService = require("../services/promotionService");
const cloudinaryUploadService = require("../services/cloudinaryUploadService");

const PROMOTION_IMAGE_FOLDER = "mosttiger/promotions";

const parseJsonField = (value, fallback) => {
  if (value === undefined) return fallback;
  if (value === null || value === "") return fallback;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
};

const parseBooleanField = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true";
  return !!value;
};

const normalizePromotionBody = (body = {}) => ({
  ...body,
  allowedCategories: parseJsonField(
    body.allowedCategories,
    body.allowedCategories,
  ),
  allowedProviders: parseJsonField(
    body.allowedProviders,
    body.allowedProviders,
  ),
  excludedProviders: parseJsonField(
    body.excludedProviders,
    body.excludedProviders,
  ),
  allowedGames: parseJsonField(body.allowedGames, body.allowedGames),
  bonusConfig: parseJsonField(body.bonusConfig, body.bonusConfig),
  freeSpinConfig: parseJsonField(body.freeSpinConfig, body.freeSpinConfig),
  newUserOnly:
    body.newUserOnly === undefined
      ? undefined
      : parseBooleanField(body.newUserOnly),
  firstDepositOnly:
    body.firstDepositOnly === undefined
      ? undefined
      : parseBooleanField(body.firstDepositOnly),
  isLifetime:
    body.isLifetime === undefined
      ? undefined
      : parseBooleanField(body.isLifetime),
  removeImage:
    body.removeImage === undefined
      ? undefined
      : parseBooleanField(body.removeImage),
});

// @desc    Create a new promotion
// @route   POST /api/admin/promotions
// @access  Private (Admin only)
exports.createPromotion = async (req, res) => {
  let uploadedImage = null;
  try {
    const body = normalizePromotionBody(req.body);
    const {
      title,
      shortDescription,
      fullDescription,
      imageUrl,
      promoCode,
      type,
      allowedCategories,
      allowedProviders,
      excludedProviders,
      allowedGames,
      newUserOnly,
      firstDepositOnly,
      maxUsagePerUser,
      bonusConfig,
      freeSpinConfig,
      isLifetime,
      expiresAt,
    } = body;

    // Validation
    if (!title || !type) {
      return res.status(400).json({
        success: false,
        message: "Title and type are required",
      });
    }

    // Check if promo code already exists (if provided)
    if (promoCode) {
      const existingPromo = await Promotion.findOne({ promoCode });
      if (existingPromo) {
        return res.status(400).json({
          success: false,
          message: "Promo code already exists",
        });
      }
    }

    // Validate expiry
    if (!isLifetime && !expiresAt) {
      return res.status(400).json({
        success: false,
        message: "Expiry date is required if promotion is not lifetime",
      });
    }

    if (!isLifetime && new Date(expiresAt) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Expiry date must be in the future",
      });
    }

    // Create promotion
    const normalizeProvider = (value) => {
      if (!value) return null;
      if (typeof value === "string") return value;
      if (value._id) return String(value._id);
      if (value.name) return String(value.name);
      return String(value);
    };

    const normalizedAllowedProviders = Array.isArray(allowedProviders)
      ? allowedProviders.map(normalizeProvider).filter(Boolean)
      : [];
    const normalizedExcludedProviders = Array.isArray(excludedProviders)
      ? excludedProviders.map(normalizeProvider).filter(Boolean)
      : [];
    const normalizedFreeSpinProvider = normalizeProvider(
      freeSpinConfig?.freeSpinProvider ||
        freeSpinConfig?.freeSpinProviderId ||
        null,
    );

    if (req.file) {
      uploadedImage = await cloudinaryUploadService.uploadImage(req.file, {
        folder: PROMOTION_IMAGE_FOLDER,
      });
    }

    const promotion = new Promotion({
      title,
      shortDescription,
      fullDescription,
      imageUrl: uploadedImage?.secureUrl || imageUrl || "",
      cloudinaryPublicId: uploadedImage?.publicId || "",
      promoCode,
      type,
      allowedCategories: allowedCategories || ["ALL"],
      allowedProviders: normalizedAllowedProviders,
      excludedProviders: normalizedExcludedProviders,
      allowedGames: allowedGames || [],
      newUserOnly: !!newUserOnly,
      firstDepositOnly: !!firstDepositOnly,
      maxUsagePerUser: Number(maxUsagePerUser || 1),
      bonusConfig: bonusConfig || {},
      freeSpinConfig: {
        ...(freeSpinConfig || {}),
        freeSpinProvider: normalizedFreeSpinProvider,
      },
      isLifetime,
      expiresAt: isLifetime ? null : expiresAt,
      status: "inactive",
    });

    await promotion.save();

    res.status(201).json({
      success: true,
      message: "Promotion created successfully",
      data: promotion,
    });
  } catch (error) {
    if (uploadedImage?.publicId) {
      await cloudinaryUploadService
        .deleteImage(uploadedImage.publicId)
        .catch(() => null);
    }

    console.error("Create promotion error:", {
      message: error.message,
      stack: error.stack,
      body: req.body,
    });

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error while creating promotion",
    });
  }
};

// @desc    Get all promotions
// @route   GET /api/admin/promotions
// @access  Private (Admin only)
exports.getAllPromotions = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type, search } = req.query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (search) {
      filter.$text = { $search: search };
    }

    // Get promotions with pagination
    const promotions = await Promotion.find(filter)
      .populate("allowedGames", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Promotion.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: promotions,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get all promotions error:", {
      message: error.message,
      stack: error.stack,
      query: req.query,
    });

    res.status(500).json({
      success: false,
      message: "Server error while fetching promotions",
    });
  }
};

// @desc    Get promotion by ID
// @route   GET /api/admin/promotions/:id
// @access  Private (Admin only)
exports.getPromotionById = async (req, res) => {
  try {
    const { id } = req.params;

    const promotion = await Promotion.findById(id).populate(
      "allowedGames",
      "name",
    );

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: "Promotion not found",
      });
    }

    res.status(200).json({
      success: true,
      data: promotion,
    });
  } catch (error) {
    console.error("Get promotion by ID error:", {
      message: error.message,
      stack: error.stack,
      id: req.params.id,
    });

    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid promotion ID",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error while fetching promotion",
    });
  }
};

// @desc    Update promotion
// @route   PUT /api/admin/promotions/:id
// @access  Private (Admin only)
exports.updatePromotion = async (req, res) => {
  let uploadedImage = null;
  let previousPublicIdToDelete = null;
  try {
    const { id } = req.params;
    const body = normalizePromotionBody(req.body);
    const {
      title,
      shortDescription,
      fullDescription,
      imageUrl,
      promoCode,
      type,
      allowedCategories,
      allowedProviders,
      excludedProviders,
      allowedGames,
      newUserOnly,
      firstDepositOnly,
      maxUsagePerUser,
      bonusConfig,
      freeSpinConfig,
      isLifetime,
      expiresAt,
      removeImage,
    } = body;

    // Find promotion
    const promotion = await Promotion.findById(id);
    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: "Promotion not found",
      });
    }

    // Check if promo code is being updated and if it's unique
    if (
      promoCode &&
      promoCode !== promotion.promoCode &&
      promoCode.toUpperCase() !== promotion.promoCode
    ) {
      const existingPromo = await Promotion.findOne({
        promoCode: promoCode.toUpperCase(),
        _id: { $ne: id },
      });
      if (existingPromo) {
        return res.status(400).json({
          success: false,
          message: "Promo code already exists",
        });
      }
    }

    // Validate expiry
    if (!isLifetime && expiresAt && new Date(expiresAt) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Expiry date must be in the future",
      });
    }

    // Update fields
    if (title !== undefined) promotion.title = title;
    if (shortDescription !== undefined)
      promotion.shortDescription = shortDescription;
    if (fullDescription !== undefined)
      promotion.fullDescription = fullDescription;
    if (req.file) {
      uploadedImage = await cloudinaryUploadService.uploadImage(req.file, {
        folder: PROMOTION_IMAGE_FOLDER,
      });
      previousPublicIdToDelete = promotion.cloudinaryPublicId;
      promotion.imageUrl = uploadedImage.secureUrl;
      promotion.cloudinaryPublicId = uploadedImage.publicId;
    } else if (removeImage) {
      previousPublicIdToDelete = promotion.cloudinaryPublicId;
      promotion.imageUrl = "";
      promotion.cloudinaryPublicId = "";
    } else if (imageUrl !== undefined) {
      promotion.imageUrl = imageUrl;
    }
    if (promoCode !== undefined) promotion.promoCode = promoCode;
    if (type !== undefined) promotion.type = type;
    if (allowedCategories !== undefined)
      promotion.allowedCategories = allowedCategories;
    const normalizeProvider = (value) => {
      if (!value) return null;
      if (typeof value === "string") return value;
      if (value._id) return String(value._id);
      if (value.name) return String(value.name);
      return String(value);
    };

    if (allowedProviders !== undefined)
      promotion.allowedProviders = Array.isArray(allowedProviders)
        ? allowedProviders.map(normalizeProvider).filter(Boolean)
        : [];
    if (excludedProviders !== undefined)
      promotion.excludedProviders = Array.isArray(excludedProviders)
        ? excludedProviders.map(normalizeProvider).filter(Boolean)
        : [];
    if (allowedGames !== undefined) promotion.allowedGames = allowedGames;
    if (newUserOnly !== undefined) promotion.newUserOnly = !!newUserOnly;
    if (firstDepositOnly !== undefined)
      promotion.firstDepositOnly = !!firstDepositOnly;
    if (maxUsagePerUser !== undefined)
      promotion.maxUsagePerUser = Math.max(1, Number(maxUsagePerUser) || 1);
    if (bonusConfig !== undefined) promotion.bonusConfig = bonusConfig;
    if (freeSpinConfig !== undefined)
      promotion.freeSpinConfig = {
        ...(freeSpinConfig || {}),
        freeSpinProvider: normalizeProvider(
          freeSpinConfig?.freeSpinProvider ||
            freeSpinConfig?.freeSpinProviderId ||
            null,
        ),
      };
    if (isLifetime !== undefined) {
      promotion.isLifetime = isLifetime;
      if (isLifetime) {
        promotion.expiresAt = null;
      }
    }
    if (expiresAt !== undefined && !isLifetime) {
      promotion.expiresAt = expiresAt;
    }

    await promotion.save();

    if (previousPublicIdToDelete) {
      await cloudinaryUploadService.deleteImage(previousPublicIdToDelete);
    }

    res.status(200).json({
      success: true,
      message: "Promotion updated successfully",
      data: promotion,
    });
  } catch (error) {
    if (uploadedImage?.publicId) {
      await cloudinaryUploadService
        .deleteImage(uploadedImage.publicId)
        .catch(() => null);
    }

    console.error("Update promotion error:", {
      message: error.message,
      stack: error.stack,
      id: req.params.id,
      body: req.body,
    });

    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid promotion ID",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error while updating promotion",
    });
  }
};

// @desc    Delete promotion
// @route   DELETE /api/admin/promotions/:id
// @access  Private (Admin only)
exports.deletePromotion = async (req, res) => {
  try {
    const { id } = req.params;

    const promotion = await Promotion.findById(id);

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: "Promotion not found",
      });
    }

    if (promotion.cloudinaryPublicId) {
      await cloudinaryUploadService.deleteImage(promotion.cloudinaryPublicId);
    }

    await promotion.deleteOne();

    res.status(200).json({
      success: true,
      message: "Promotion deleted successfully",
      data: promotion,
    });
  } catch (error) {
    console.error("Delete promotion error:", {
      message: error.message,
      stack: error.stack,
      id: req.params.id,
    });

    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid promotion ID",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error while deleting promotion",
    });
  }
};

// -----------------------
// User-facing promotion APIs
// -----------------------

// @desc    Get user's current bonuses (claimable + claimed history)
// @route   GET /api/promotions/my-bonuses
// @access  Private (User)
exports.myBonuses = async (req, res) => {
  try {
    const userId = req.user.id;
    const PromotionTurnover = require("../models/PromotionTurnover");

    const turnovers = await PromotionTurnover.find({
      user: userId,
    })
      .populate("promotion", "title imageUrl type")
      .sort({ createdAt: -1 })
      .lean();

    const mapped = turnovers.map((t) => ({
      turnoverId: t._id,
      promotion: t.promotion || null,
      status: t.claimed ? "claimed" : "claimable",
      bonusAmount: t.bonusAmount,
      turnoverRequired: t.turnoverRequired,
      turnoverCompleted: t.turnoverCompleted,
      remainingTurnover: Math.max(0, t.turnoverRequired - t.turnoverCompleted),
      turnoverPercentage: Number(t.turnoverPercentage || 0).toFixed(2),
      claimed: !!t.claimed,
      claimedAt: t.claimedAt || null,
      createdAt: t.createdAt,
    }));

    return res.status(200).json({ success: true, data: mapped });
  } catch (error) {
    console.error("Get my bonuses error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load bonuses" });
  }
};

// @desc    Get public promotions with eligibility flags
// @route   GET /api/promotions
// @access  Public (optionally authenticated)
exports.getPublicPromotions = async (req, res) => {
  try {
    const userId = req.user?.id || null;

    const promotions = await Promotion.find({
      status: "active",
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    })
      .select(
        "title shortDescription fullDescription imageUrl promoCode type allowedCategories allowedProviders excludedProviders bonusConfig freeSpinConfig newUserOnly firstDepositOnly maxUsagePerUser expiresAt isLifetime status createdAt",
      )
      .sort({ createdAt: -1 })
      .lean();

    const decorated = [];
    for (const promotion of promotions) {
      const eligibility = userId
        ? await promotionService.validatePromotionEligibility(userId, promotion)
        : {
            isEligible: !promotion.newUserOnly && !promotion.firstDepositOnly,
            alreadyUsed: false,
          };

      const item = {
        ...promotion,
        isEligible: eligibility.isEligible,
        alreadyUsed: eligibility.alreadyUsed,
      };

      if (promotion.newUserOnly || promotion.firstDepositOnly) {
        if (eligibility.isEligible) {
          decorated.push(item);
        }
      } else {
        decorated.push(item);
      }
    }

    return res.status(200).json({ success: true, data: decorated });
  } catch (error) {
    console.error("Get public promotions error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load promotions",
    });
  }
};

// @desc    Claim a promotion bonus (move wallet.bonus -> wallet.main)
// @route   POST /api/promotions/claim-bonus/:turnoverId
// @access  Private (User)
exports.claimBonus = async (req, res) => {
  const mongoose = require("mongoose");
  const session = await mongoose.startSession();

  try {
    const { turnoverId } = req.params;
    const userId = req.user.id;
    if (!turnoverId) {
      return res
        .status(400)
        .json({ success: false, message: "turnoverId is required" });
    }

    const PromotionTurnover = require("../models/PromotionTurnover");
    const UserPromotion = require("../models/UserPromotion");
    const WalletService = require("../services/walletService");

    session.startTransaction();

    const turnover = await PromotionTurnover.findOneAndUpdate(
      {
        _id: turnoverId,
        user: userId,
        claimed: { $ne: true },
        bonusAmount: { $gt: 0 },
      },
      { $set: { claimed: true, claimedAt: new Date() } },
      { new: true, session },
    ).lean();

    if (!turnover) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Bonus already claimed or not available",
      });
    }

    const bonusAmount = Number(turnover.bonusAmount || 0);
    if (bonusAmount <= 0) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ success: false, message: "No bonus to claim" });
    }

    await WalletService.updateWallet(
      userId,
      -bonusAmount,
      "bonus",
      "bonus",
      {
        description: "Promotion bonus claimed from bonus wallet",
        promotionId: turnover.promotion,
        promotionTurnoverId: turnover._id,
      },
      session,
    );

    const walletResult = await WalletService.updateWallet(
      userId,
      bonusAmount,
      "main",
      "bonus",
      {
        description: "Promotion bonus claimed to main wallet",
        promotionId: turnover.promotion,
        promotionTurnoverId: turnover._id,
      },
      session,
    );

    // Decrease userPromotion.bonusBalance if exists and set claimed flag
    await UserPromotion.findOneAndUpdate(
      {
        user: userId,
        promotion: turnover.promotion,
        claimed: { $ne: true },
      },
      {
        $set: {
          bonusBalance: 0,
          claimed: true,
          claimedAt: turnover.claimedAt || new Date(),
        },
      },
      {
        sort: { createdAt: 1 },
        session,
      },
    );

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "Bonus claimed and moved to main wallet",
      data: {
        bonusAmount,
        wallet: {
          main: walletResult.newBalance,
        },
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Claim bonus error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to claim bonus" });
  } finally {
    session.endSession();
  }
};

// @desc    Get user's free spins
// @route   GET /api/promotions/my-free-spins
// @access  Private (User)
exports.myFreeSpins = async (req, res) => {
  try {
    const userId = req.user.id;
    const UserPromotion = require("../models/UserPromotion");

    const promos = await UserPromotion.find({
      user: userId,
      $or: [{ remainingFreeSpins: { $gt: 0 } }, { freeSpinValue: { $gt: 0 } }],
    })
      .populate("promotion", "title imageUrl type freeSpinConfig")
      .lean();

    const mapped = promos.map((p) => ({
      userPromotionId: p._id,
      promotion: p.promotion || null,
      promotionTitle: p.promotion?.title || null,
      promotionImage: p.promotion?.imageUrl || null,
      remainingFreeSpins: p.remainingFreeSpins || 0,
      freeSpinValue: p.freeSpinValue || 0,
      freeSpinProvider:
        p.freeSpinProvider ||
        p.promotion?.freeSpinConfig?.freeSpinProvider ||
        null,
      claimed: !!p.claimed,
      claimedAt: p.claimedAt || null,
      status: p.status,
      expiresAt: p.expiresAt,
    }));

    return res.status(200).json({ success: true, data: mapped });
  } catch (error) {
    console.error("Get my free spins error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load free spins" });
  }
};

// @desc    Claim free spins (convert to playable main balance)
// @route   POST /api/promotions/claim-free-spins/:promotionId
// @access  Private (User)
exports.claimFreeSpins = async (req, res) => {
  try {
    const { promotionId } = req.params;
    const userId = req.user.id;
    if (!promotionId)
      return res
        .status(400)
        .json({ success: false, message: "promotionId is required" });

    const mongoose = require("mongoose");
    const Promotion = require("../models/Promotion");
    const UserPromotion = require("../models/UserPromotion");
    const User = require("../models/User");

    const session = await mongoose.startSession();
    let updatedUser;
    let credit = 0;

    try {
      await session.withTransaction(async () => {
        const promotion =
          await Promotion.findById(promotionId).session(session);
        if (!promotion) {
          throw Object.assign(new Error("Invalid promotion"), {
            statusCode: 404,
          });
        }

        const userPromotion = await UserPromotion.findOne({
          user: userId,
          promotion: promotionId,
        }).session(session);
        if (!userPromotion) {
          throw Object.assign(new Error("User promotion not found"), {
            statusCode: 404,
          });
        }

        if (userPromotion.claimed) {
          throw Object.assign(new Error("Free spins already claimed"), {
            statusCode: 400,
          });
        }

        const spins = Number(userPromotion.remainingFreeSpins || 0);
        const value = Number(userPromotion.freeSpinValue || 0);
        if (spins <= 0 || value <= 0) {
          throw Object.assign(new Error("No free spins available to claim"), {
            statusCode: 400,
          });
        }

        credit = spins * value;

        updatedUser = await User.findByIdAndUpdate(
          userId,
          { $inc: { "wallet.main": credit } },
          { new: true, session },
        ).select("wallet");

        if (!updatedUser) {
          throw Object.assign(new Error("Failed to update wallet"), {
            statusCode: 500,
          });
        }

        await UserPromotion.updateOne(
          { _id: userPromotion._id },
          {
            $set: {
              remainingFreeSpins: 0,
              claimed: true,
              claimedAt: new Date(),
            },
          },
          { session },
        );
      });
    } finally {
      session.endSession();
    }

    return res.status(200).json({
      success: true,
      message: "Free spins claimed successfully",
      data: { credit, wallet: updatedUser.wallet },
    });
  } catch (error) {
    console.error("Claim free spins error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to claim free spins",
    });
  }
};

// @desc    Activate promotion
// @route   PUT /api/admin/promotions/:id/activate
// @access  Private (Admin only)
exports.activatePromotion = async (req, res) => {
  try {
    const { id } = req.params;

    const promotion = await Promotion.findById(id);

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: "Promotion not found",
      });
    }

    // Check if promotion is already active
    if (promotion.status === "active") {
      return res.status(400).json({
        success: false,
        message: "Promotion is already active",
      });
    }

    // Check expiry
    if (!promotion.isLifetime && promotion.isExpired) {
      return res.status(400).json({
        success: false,
        message: "Cannot activate an expired promotion",
      });
    }

    promotion.status = "active";
    await promotion.save();

    res.status(200).json({
      success: true,
      message: "Promotion activated successfully",
      data: promotion,
    });
  } catch (error) {
    console.error("Activate promotion error:", {
      message: error.message,
      stack: error.stack,
      id: req.params.id,
    });

    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid promotion ID",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error while activating promotion",
    });
  }
};

// @desc    Deactivate promotion
// @route   PUT /api/admin/promotions/:id/deactivate
// @access  Private (Admin only)
exports.deactivatePromotion = async (req, res) => {
  try {
    const { id } = req.params;

    const promotion = await Promotion.findById(id);

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: "Promotion not found",
      });
    }

    // Check if promotion is already inactive
    if (promotion.status === "inactive") {
      return res.status(400).json({
        success: false,
        message: "Promotion is already inactive",
      });
    }

    promotion.status = "inactive";
    await promotion.save();

    res.status(200).json({
      success: true,
      message: "Promotion deactivated successfully",
      data: promotion,
    });
  } catch (error) {
    console.error("Deactivate promotion error:", {
      message: error.message,
      stack: error.stack,
      id: req.params.id,
    });

    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid promotion ID",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error while deactivating promotion",
    });
  }
};

// @desc    Apply promotion to a user's deposit
// @route   POST /api/admin/promotions/:promotionId/apply
// @access  Private (Admin only)
exports.applyPromotionToDeposit = async (req, res) => {
  try {
    const { promotionId } = req.params;
    const { userId, depositAmount, depositId } = req.body;

    // Validation
    if (!userId || !depositAmount || depositAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "userId, depositAmount (> 0), and depositId are required",
      });
    }

    // Check if promotion exists
    const promotion = await Promotion.findById(promotionId);
    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: "Promotion not found",
      });
    }

    const eligibility = await promotionService.validatePromotionEligibility(
      userId,
      promotion,
    );

    if (!eligibility.isEligible) {
      return res.status(400).json({
        success: false,
        message: eligibility.reason,
      });
    }

    // Apply promotion
    const result = await promotionService.applyDepositPromotion(
      userId,
      promotionId,
      depositAmount,
      depositId,
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    res.status(200).json({
      success: true,
      message: "Promotion applied successfully",
      data: result,
    });
  } catch (error) {
    console.error("Apply promotion to deposit error:", {
      message: error.message,
      stack: error.stack,
      body: req.body,
    });

    res.status(500).json({
      success: false,
      message: "Server error while applying promotion",
    });
  }
};

// @desc    Check user's withdrawal lock status
// @route   GET /api/admin/promotions/user/:userId/withdrawal-lock
// @access  Private (Admin only)
exports.checkUserWithdrawalLock = async (req, res) => {
  try {
    const { userId } = req.params;

    const promotionService = require("../services/promotionService");
    const lockStatus = await promotionService.checkWithdrawalLock(userId);

    res.status(200).json({
      success: true,
      data: lockStatus,
    });
  } catch (error) {
    console.error("Check withdrawal lock error:", {
      message: error.message,
      stack: error.stack,
      userId: req.params.userId,
    });

    res.status(500).json({
      success: false,
      message: "Server error while checking withdrawal lock",
    });
  }
};
