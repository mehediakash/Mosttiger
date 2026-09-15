const Promotion = require("../models/Promotion");
const PromotionTurnover = require("../models/PromotionTurnover");
const UserPromotion = require("../models/UserPromotion");
const User = require("../models/User");
const Deposit = require("../models/Deposit");
const {
  canWithdrawWithTurnover,
  logTurnoverValidation,
} = require("../utils/turnoverEligibility");

class PromotionService {
  async getUserCompletedDepositCount(userId, excludeDepositId = null) {
    if (!userId) return 0;

    const query = {
      user: userId,
      status: { $in: ["approved", "completed"] },
    };

    if (excludeDepositId) {
      query._id = { $ne: excludeDepositId };
    }

    return Deposit.countDocuments(query);
  }

  async validatePromotionEligibility(
    userId,
    promotion,
    excludeDepositId = null,
  ) {
    const promotionId = promotion?._id || promotion?.id || promotion;

    const alreadyUsedCount = await UserPromotion.countDocuments({
      user: userId,
      promotion: promotionId,
    });

    const completedDepositCount = await this.getUserCompletedDepositCount(
      userId,
      excludeDepositId,
    );

    const requiresNewUser =
      !!promotion?.newUserOnly || !!promotion?.firstDepositOnly;
    const isEligible = !requiresNewUser || completedDepositCount === 0;
    const alreadyUsed = alreadyUsedCount >= (promotion?.maxUsagePerUser || 1);

    return {
      isEligible: isEligible && !alreadyUsed,
      alreadyUsed,
      completedDepositCount,
      requiresNewUser,
      usageCount: alreadyUsedCount,
      maxUsagePerUser: promotion?.maxUsagePerUser || 1,
      reason: !isEligible
        ? "This promotion is available for new users only."
        : alreadyUsed
          ? "You have already used this promotion."
          : null,
    };
  }

  /**
   * Calculate bonus amount based on promotion configuration
   * @param {Object} promotion - Promotion document
   * @param {number} depositAmount - Deposit amount
   * @returns {number} - Calculated bonus amount
   */
  calculateBonus(promotion, depositAmount) {
    const { bonusConfig } = promotion;

    if (!bonusConfig) {
      return 0;
    }

    // Check min/max deposit limits
    if (bonusConfig.minDeposit && depositAmount < bonusConfig.minDeposit) {
      return 0;
    }

    if (bonusConfig.maxDeposit && depositAmount > bonusConfig.maxDeposit) {
      return 0;
    }

    let bonus = 0;

    // Calculate based on percent or fixed amount
    if (bonusConfig.bonusPercent && bonusConfig.bonusPercent > 0) {
      bonus = (depositAmount * bonusConfig.bonusPercent) / 100;
    } else if (
      bonusConfig.fixedBonusAmount &&
      bonusConfig.fixedBonusAmount > 0
    ) {
      bonus = bonusConfig.fixedBonusAmount;
    }

    // Apply max bonus cap
    if (bonusConfig.maxBonus && bonus > bonusConfig.maxBonus) {
      bonus = bonusConfig.maxBonus;
    }

    return bonus;
  }

  /**
   * Calculate turnover requirement
   * @param {Object} promotion - Promotion document
   * @param {number} depositAmount - Deposit amount
   * @param {number} bonusAmount - Bonus amount
   * @returns {number} - Turnover requirement
   */
  calculateTurnover(promotion, depositAmount, bonusAmount) {
    const { bonusConfig } = promotion;

    if (!bonusConfig || !bonusConfig.turnoverMultiplier) {
      return 0;
    }

    // Turnover = (Deposit + Bonus) * Multiplier
    const baseAmount = depositAmount + bonusAmount;
    const turnoverRequired = baseAmount * bonusConfig.turnoverMultiplier;

    return turnoverRequired;
  }

  /**
   * Apply promotion to a deposit
   * Creates PromotionTurnover and UserPromotion records
   * Adds bonus to wallet.bonus
   * Locks withdrawal
   *
   * @param {string} userId - User ID
   * @param {string} promotionId - Promotion ID
   * @param {number} depositAmount - Deposit amount
   * @param {string} depositId - Deposit ID (for reference)
   * @returns {Object} - Result with bonus, turnover, and status
   */
  async applyDepositPromotion(userId, promotionId, depositAmount, depositId) {
    try {
      console.log("PROMOTION APPLY START", {
        userId,
        promotionId,
        depositAmount,
        depositId,
      });

      // Fetch promotion
      const promotion = await Promotion.findById(promotionId);
      if (!promotion) {
        throw new Error("Promotion not found");
      }

      console.log("PROMOTION FOUND", promotion);

      // Fetch user
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Check if promotion is active
      if (promotion.status !== "active") {
        throw new Error("Promotion is not active");
      }

      // Check if promotion is expired
      if (!promotion.isLifetime && promotion.isExpired) {
        throw new Error("Promotion has expired");
      }

      // Enforce new-user-only / single-use eligibility before any wallet mutation
      // Exclude current deposit from new-user check to avoid false rejection in live flow
      const eligibility = await this.validatePromotionEligibility(
        userId,
        promotion,
        depositId,
      );

      if (!eligibility.isEligible) {
        return {
          success: false,
          message: eligibility.reason,
          bonusAmount: 0,
          isEligible: false,
          alreadyUsed: eligibility.alreadyUsed,
        };
      }

      // Calculate bonus
      const calculatedBonus = this.calculateBonus(promotion, depositAmount);

      console.log("BONUS CALCULATION", {
        depositAmount,
        calculatedBonus,
        bonusPercent: promotion.bonusConfig?.bonusPercent,
        maxBonus: promotion.bonusConfig?.maxBonus,
      });

      const bonusAmount = calculatedBonus;

      console.log("📊 [PROMOTION] Bonus calculated:", {
        promotionId,
        userId,
        depositAmount,
        bonusAmount,
        bonusPercent: promotion.bonusConfig?.bonusPercent,
      });

      if (bonusAmount <= 0) {
        console.warn(
          "⚠️ [PROMOTION] Bonus is 0 or negative, returning early:",
          {
            bonusAmount,
            message: "Promotion does not qualify for this deposit amount",
          },
        );
        return {
          success: false,
          message: "Promotion does not qualify for this deposit amount",
          bonusAmount: 0,
        };
      }

      // Calculate turnover requirement
      const turnoverRequired = this.calculateTurnover(
        promotion,
        depositAmount,
        bonusAmount,
      );

      console.log("🎯 [PROMOTION] Turnover calculated:", {
        turnoverRequired,
        multiplier: promotion.bonusConfig?.turnoverMultiplier,
      });

      // Calculate expiry date for turnover (default 30 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Queue rule: only one turnover can be active at a time
      const queuedTurnover = await PromotionTurnover.findOne({
        user: userId,
        status: { $in: ["active", "pending"] },
        expiresAt: { $gt: new Date() },
      }).sort({ createdAt: 1 });

      const turnoverStatus = queuedTurnover ? "pending" : "active";

      // 1. Create PromotionTurnover entry
      const promotionTurnover = new PromotionTurnover({
        user: userId,
        promotion: promotionId,
        depositAmount,
        bonusAmount,
        turnoverRequired,
        turnoverCompleted: 0,
        turnoverPercentage: 0,
        allowedCategories: promotion.allowedCategories,
        allowedProviders: promotion.allowedProviders,
        withdrawLocked: true,
        status: turnoverStatus,
        expiresAt,
      });

      await promotionTurnover.save();
      console.log(
        "✅ [PROMOTION] PromotionTurnover created:",
        promotionTurnover._id,
      );

      // 2. Create UserPromotion entry
      const userPromotion = new UserPromotion({
        user: userId,
        promotion: promotionId,
        remainingFreeSpins: 0,
        freeSpinValue: 0,
        freeSpinProvider: null,
        bonusBalance: bonusAmount,
        allowedProviders: promotion.allowedProviders,
        allowedCategories: promotion.allowedCategories,
        status: "active",
        expiresAt,
      });

      // Handle free spins whenever the promotion has a valid freeSpinConfig
      if (promotion.freeSpinConfig) {
        const freeSpinCount = Number(
          promotion.freeSpinConfig.freeSpinCount || 0,
        );
        const freeSpinValue = Number(
          promotion.freeSpinConfig.freeSpinValue || 0,
        );
        const freeSpinProvider =
          promotion.freeSpinConfig.freeSpinProvider || null;

        userPromotion.remainingFreeSpins =
          freeSpinCount > 0 ? freeSpinCount : 0;
        userPromotion.freeSpinValue = freeSpinValue > 0 ? freeSpinValue : 0;
        userPromotion.freeSpinProvider = freeSpinProvider;
      }

      await userPromotion.save();
      console.log("✅ [PROMOTION] UserPromotion created:", userPromotion._id);

      // 3. Add bonus to wallet.bonus (NOT wallet.main)
      // Use atomic update only; never overwrite the wallet object.
      const existingUser = await User.findById(userId).select("wallet").lean();

      if (!existingUser) {
        throw new Error("User not found during wallet update");
      }

      const previousBonusBalance = Number(existingUser?.wallet?.bonus || 0);

      console.log("UPDATING BONUS WALLET", {
        userId,
        bonusAmount,
      });

      const walletUpdateResult = await User.updateOne(
        { _id: userId },
        {
          $inc: {
            "wallet.bonus": bonusAmount,
          },
        },
      );

      if (!walletUpdateResult || walletUpdateResult.matchedCount === 0) {
        throw new Error("Bonus wallet update did not match any user document");
      }

      if (walletUpdateResult.modifiedCount === 0) {
        throw new Error("Bonus wallet update did not modify the user document");
      }

      const verifiedUser = await User.findById(userId).select("wallet").lean();

      console.log("UPDATED USER WALLET", verifiedUser?.wallet);

      console.log("BONUS WALLET UPDATED", {
        previousBonusBalance,
        currentBonusBalance: verifiedUser?.wallet?.bonus || 0,
        addedBonus: bonusAmount,
      });

      const expectedBonusBalance = previousBonusBalance + bonusAmount;
      const currentBonusBalance = Number(verifiedUser?.wallet?.bonus || 0);

      if (currentBonusBalance !== expectedBonusBalance) {
        throw new Error("Wallet bonus synchronization failed");
      }

      try {
        const Transaction = require("../models/Transaction");
        await Transaction.create({
          user: userId,
          type: "bonus",
          amount: bonusAmount,
          walletType: "bonus",
          previousBalance: previousBonusBalance,
          newBalance: expectedBonusBalance,
          status: "completed",
          paymentMethod: "system",
          description: `Promotion bonus: ${promotion.title}`,
          metadata: {
            promotionId,
            depositId,
            promotionTurnoverId: promotionTurnover._id,
            userPromotionId: userPromotion._id,
          },
        });
      } catch (txError) {
        console.warn("⚠️ [PROMOTION] Failed to create transaction record:", {
          message: txError.message,
        });
      }

      // 4. Mark withdrawal as locked (store in user doc or separate collection)
      // This is typically handled by checking active PromotionTurnover records

      return {
        success: true,
        message: "Promotion applied successfully",
        bonusAmount,
        turnoverRequired,
        promotionTurnoverId: promotionTurnover._id,
        turnoverStatus: promotionTurnover.status,
        userPromotionId: userPromotion._id,
        promotion: {
          title: promotion.title,
          type: promotion.type,
          promoCode: promotion.promoCode,
        },
      };
    } catch (error) {
      console.error("PROMOTION APPLY ERROR", error);
      console.error("❌ [PROMOTION] Apply deposit promotion error:", {
        message: error.message,
        stack: error.stack,
        userId,
        promotionId,
        depositAmount,
        depositId,
      });

      return {
        success: false,
        message: error.message || "Failed to apply promotion",
        bonusAmount: 0,
      };
    }
  }

  /**
   * Check if user has withdrawal locked due to active promotion turnover
   * @param {string} userId - User ID
   * @returns {Object} - Lock status and details
   */
  async checkWithdrawalLock(userId) {
    try {
      const lockedTurnover = await PromotionTurnover.findOne({
        user: userId,
        status: { $in: ["active", "pending"] },
        withdrawLocked: true,
        expiresAt: { $gt: new Date() },
      })
        .populate("promotion", "title type promoCode")
        .lean();

      if (!lockedTurnover) {
        return {
          isLocked: false,
        };
      }

      const canWithdraw = logTurnoverValidation(lockedTurnover);

      if (canWithdraw) {
        return {
          isLocked: false,
          canWithdraw: true,
          turnoverId: lockedTurnover._id,
          status: lockedTurnover.status,
          withdrawLocked: lockedTurnover.withdrawLocked,
          turnoverCompleted: lockedTurnover.turnoverCompleted,
          turnoverRequired: lockedTurnover.turnoverRequired,
          turnoverPercentage: Math.max(
            Number(lockedTurnover.turnoverPercentage || 0),
            100,
          ),
          completedAt: lockedTurnover.completedAt,
        };
      }

      return {
        isLocked: true,
        canWithdraw: canWithdrawWithTurnover(lockedTurnover),
        turnoverId: lockedTurnover._id,
        promotion: lockedTurnover.promotion,
        status: lockedTurnover.status,
        withdrawLocked: lockedTurnover.withdrawLocked,
        turnoverCompleted: lockedTurnover.turnoverCompleted,
        turnoverRequired: lockedTurnover.turnoverRequired,
        remainingTurnover: Math.max(
          0,
          lockedTurnover.turnoverRequired - lockedTurnover.turnoverCompleted,
        ),
        turnoverPercentage: lockedTurnover.turnoverPercentage,
        completedAt: lockedTurnover.completedAt,
        expiresAt: lockedTurnover.expiresAt,
      };
    } catch (error) {
      console.error("Check withdrawal lock error:", error);
      return {
        isLocked: false,
        error: error.message,
      };
    }
  }

  /**
   * Update turnover completion
   * @param {string} turnoverId - PromotionTurnover ID
   * @param {number} amount - Amount wagered/played
   * @returns {Object} - Updated turnover status
   */
  async updateTurnoverProgress(turnoverId, amount) {
    try {
      const turnover = await PromotionTurnover.findById(turnoverId);

      if (!turnover) {
        throw new Error("Turnover record not found");
      }

      // Update turnover completed
      turnover.turnoverCompleted = Math.min(
        turnover.turnoverCompleted + amount,
        turnover.turnoverRequired,
      );

      // Calculate percentage
      turnover.turnoverPercentage =
        (turnover.turnoverCompleted / turnover.turnoverRequired) * 100;

      // Check if turnover is complete
      if (turnover.turnoverCompleted >= turnover.turnoverRequired) {
        turnover.status = "completed";
        turnover.withdrawLocked = false;
        turnover.completedAt = new Date();

        const currentUser = await User.findById(turnover.user).select("wallet");
        const bonusAmount = Math.min(
          Number(turnover.bonusAmount || 0),
          Number(currentUser?.wallet?.bonus || 0),
        );

        if (currentUser && bonusAmount > 0) {
          await User.findByIdAndUpdate(turnover.user, {
            $inc: {
              "wallet.main": bonusAmount,
              "wallet.bonus": -bonusAmount,
            },
          });
        }

        await UserPromotion.findOneAndUpdate(
          {
            user: turnover.user,
            promotion: turnover.promotion,
          },
          {
            $set: {
              bonusBalance: 0,
              status: "completed",
            },
          },
        );

        const nextPendingTurnover = await PromotionTurnover.findOne({
          user: turnover.user,
          status: "pending",
          expiresAt: { $gt: new Date() },
        }).sort({ createdAt: 1 });

        if (nextPendingTurnover) {
          nextPendingTurnover.status = "active";
          nextPendingTurnover.withdrawLocked = true;
          await nextPendingTurnover.save();
        }
      }

      await turnover.save();

      return {
        success: true,
        turnoverId,
        turnoverCompleted: turnover.turnoverCompleted,
        turnoverRequired: turnover.turnoverRequired,
        turnoverPercentage: turnover.turnoverPercentage,
        isComplete: turnover.status === "completed",
      };
    } catch (error) {
      console.error("Update turnover progress error:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Expire inactive/expired promotions
   * Called periodically via cron job
   */
  async expireOldPromotions() {
    try {
      const now = new Date();

      // Expire PromotionTurnover records
      const expiredTurnovers = await PromotionTurnover.updateMany(
        {
          status: { $in: ["active", "pending"] },
          expiresAt: { $lt: now },
        },
        {
          status: "expired",
          withdrawLocked: false,
        },
      );

      // Expire UserPromotion records
      const expiredUserPromos = await UserPromotion.updateMany(
        {
          status: "active",
          expiresAt: { $lt: now },
        },
        {
          status: "expired",
        },
      );

      console.log("Promotion expiry check completed:", {
        turnoversExpired: expiredTurnovers.modifiedCount,
        userPromosExpired: expiredUserPromos.modifiedCount,
      });

      return {
        turnoversExpired: expiredTurnovers.modifiedCount,
        userPromosExpired: expiredUserPromos.modifiedCount,
      };
    } catch (error) {
      console.error("Expire promotions error:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }
}

module.exports = new PromotionService();
