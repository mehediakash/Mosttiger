const PromoCode = require("../models/PromoCode");
const PromoCodeUsage = require("../models/PromoCodeUsage");
const User = require("../models/User");
const WalletService = require("./walletService");

class PromoCodeService {
  // Create new promo code
  async createPromoCode(promoData, createdBy) {
    try {
      // Check if code already exists
      const existingCode = await PromoCode.findOne({
        code: promoData.code.toUpperCase(),
      });
      if (existingCode) {
        throw new Error("Promo code already exists");
      }

      const promoCode = new PromoCode({
        ...promoData,
        createdBy: createdBy,
      });

      await promoCode.save();

      return {
        success: true,
        promoCode: promoCode,
      };
    } catch (error) {
      throw error;
    }
  }

  // Validate and apply promo code
  async applyPromoCode(userId, code, depositAmount = 0) {
    const session = await PromoCode.startSession();
    session.startTransaction();

    try {
      const promoCode = await PromoCode.findOne({
        code: code.toUpperCase(),
      }).session(session);

      if (!promoCode) {
        throw new Error("Invalid promo code");
      }

      // Validate promo code
      const validation = await this.validatePromoCode(
        promoCode,
        userId,
        depositAmount,
      );
      if (!validation.isValid) {
        throw new Error(validation.message);
      }

      // Calculate bonus amount
      const bonusAmount = this.calculateBonusAmount(promoCode, depositAmount);

      // Create promo code usage record
      const usage = new PromoCodeUsage({
        user: userId,
        promoCode: promoCode._id,
        bonusAmount: bonusAmount,
        walletType: promoCode.walletType,
        depositAmount: depositAmount,
        status: "active",
      });

      await usage.save({ session });

      // Update promo code usage count
      promoCode.usedCount += 1;
      await promoCode.save({ session });

      // Add bonus to user wallet
      await WalletService.updateWallet(
        userId,
        bonusAmount,
        promoCode.walletType,
        "bonus",
        {
          description: `Promo code bonus: ${promoCode.code}`,
          promoCode: promoCode._id,
          usageId: usage._id,
        },
      );

      await session.commitTransaction();
      session.endSession();

      return {
        success: true,
        bonusAmount: bonusAmount,
        bonusPercentage: promoCode.percentage || 0,
        maxBonus: promoCode.maxBonus || 0,
        walletType: promoCode.walletType,
        usageId: usage._id,
        turnoverRequirement: promoCode.turnoverRequirement || 0,
        validUntil: promoCode.validUntil,
        message: `${promoCode.name || "Promo code"} applied successfully!`,
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  // Validate promo code
  async validatePromoCode(promoCode, userId, depositAmount) {
    // Check if active
    if (!promoCode.isActive) {
      return { isValid: false, message: "Promo code is not active" };
    }

    // Check expiration
    if (promoCode.isExpired) {
      return { isValid: false, message: "Promo code has expired" };
    }

    // Check if user is allowed
    if (
      promoCode.allowedUsers.length > 0 &&
      !promoCode.allowedUsers.includes(userId)
    ) {
      return {
        isValid: false,
        message: "Promo code not available for this user",
      };
    }

    // Check if user is excluded
    if (promoCode.excludedUsers.includes(userId)) {
      return {
        isValid: false,
        message: "Promo code not available for this user",
      };
    }

    // Check if new users only
    if (promoCode.newUsersOnly) {
      const user = await User.findById(userId);
      const userAge = Date.now() - user.createdAt.getTime();
      const oneDay = 24 * 60 * 60 * 1000;

      if (userAge > oneDay) {
        return { isValid: false, message: "Promo code for new users only" };
      }
    }

    // Check deposit amount for deposit bonuses
    if (
      promoCode.type === "deposit_bonus" &&
      depositAmount < promoCode.minDeposit
    ) {
      return {
        isValid: false,
        message: `Minimum deposit of ৳${promoCode.minDeposit.toLocaleString()} required for this promo code`,
      };
    }

    // Check if user has already used this code
    if (promoCode.isSingleUse) {
      const existingUsage = await PromoCodeUsage.findOne({
        user: userId,
        promoCode: promoCode._id,
      });

      if (existingUsage) {
        return { isValid: false, message: "Promo code already used" };
      }
    }

    return { isValid: true, message: "Valid promo code" };
  }

  // Calculate bonus amount
  calculateBonusAmount(promoCode, depositAmount) {
    let bonusAmount = promoCode.bonusAmount;

    if (promoCode.percentage > 0) {
      const percentageBonus = (depositAmount * promoCode.percentage) / 100;
      bonusAmount += percentageBonus;
    }

    // Apply maximum bonus limit
    if (promoCode.maxBonus > 0 && bonusAmount > promoCode.maxBonus) {
      bonusAmount = promoCode.maxBonus;
    }

    return bonusAmount;
  }

  // Get user's active promo codes
  async getUserActivePromoCodes(userId) {
    const activeUsages = await PromoCodeUsage.find({
      user: userId,
      status: "active",
    }).populate("promoCode", "name description type turnoverRequirement");

    return activeUsages.map((usage) => ({
      usageId: usage._id,
      bonusAmount: usage.bonusAmount,
      walletType: usage.walletType,
      turnoverProgress: usage.turnoverProgress,
      promoCode: usage.promoCode,
    }));
  }

  // Update turnover progress for promo codes
  async updateTurnoverProgress(userId, betAmount) {
    const activeUsages = await PromoCodeUsage.find({
      user: userId,
      status: "active",
    }).populate("promoCode");

    for (const usage of activeUsages) {
      if (usage.promoCode.turnoverRequirement > 0) {
        usage.turnoverProgress += betAmount;

        // Check if turnover requirement is met
        if (usage.turnoverProgress >= usage.promoCode.turnoverRequirement) {
          usage.status = "used";
          usage.usedAt = new Date();
        }

        await usage.save();
      }
    }
  }

  // Get promo code analytics
  async getPromoCodeAnalytics(promoCodeId) {
    const promoCode = await PromoCode.findById(promoCodeId);
    const usages = await PromoCodeUsage.find({ promoCode: promoCodeId });

    const totalBonus = usages.reduce(
      (sum, usage) => sum + usage.bonusAmount,
      0,
    );
    const activeUsages = usages.filter(
      (usage) => usage.status === "active",
    ).length;
    const usedUsages = usages.filter((usage) => usage.status === "used").length;

    return {
      promoCode: promoCode,
      statistics: {
        totalUses: usages.length,
        activeUsages,
        usedUsages,
        totalBonusGiven: totalBonus,
        redemptionRate:
          promoCode.maxUses > 0 ? (usages.length / promoCode.maxUses) * 100 : 0,
      },
      recentUsages: usages.slice(0, 10),
    };
  }
}

module.exports = new PromoCodeService();
