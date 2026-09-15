const PromotionTurnover = require("../models/PromotionTurnover");
const Game = require("../models/Game");

class TurnoverTrackingService {
  /**
   * Record a bet/wager towards turnover requirement
   * Validates all conditions before updating
   *
   * @param {string} userId - User ID
   * @param {string|Object} gameInput - Game ID or hydrated game document
   * @param {number} betAmount - Bet amount
   * @returns {Object} - Result of turnover update
   */
  async recordBet(userId, gameInput, betAmount) {
    try {
      // Validation
      if (!userId || !gameInput || !betAmount || betAmount <= 0) {
        return {
          success: false,
          message: "userId, gameInput, and betAmount (> 0) are required",
        };
      }

      // 1. Fetch game details
      const game =
        typeof gameInput === "object" && gameInput !== null
          ? gameInput
          : await Game.findById(gameInput).lean();
      if (!game) {
        return {
          success: false,
          message: "Game not found",
        };
      }

      // 2. Find the active turnover record for user (queue model: only one active at a time)
      const activeTurnover = await PromotionTurnover.findOne({
        user: userId,
        status: "active",
        expiresAt: { $gt: new Date() },
      }).sort({ createdAt: 1 });

      if (!activeTurnover) {
        return {
          success: false,
          message: "No active turnover records found for user",
          betTracked: false,
        };
      }

      const results = [];

      // 3. Validate and process the single active turnover
      const providerValid = await this.validateProvider(
        activeTurnover,
        game.brand,
      );
      if (!providerValid.valid) {
        return {
          success: false,
          message: providerValid.reason,
          betAmount,
          gameDetails: {
            gameId: game._id || gameInput,
            gameName: game.game_name,
            brand: game.brand,
            category: game.category,
          },
          turnovers: [
            {
              turnoverId: activeTurnover._id,
              success: false,
              reason: providerValid.reason,
            },
          ],
          totalUpdated: 0,
        };
      }

      const categoryValid = await this.validateCategory(
        activeTurnover,
        game.category,
      );
      if (!categoryValid.valid) {
        return {
          success: false,
          message: categoryValid.reason,
          betAmount,
          gameDetails: {
            gameId: game._id || gameInput,
            gameName: game.game_name,
            brand: game.brand,
            category: game.category,
          },
          turnovers: [
            {
              turnoverId: activeTurnover._id,
              success: false,
              reason: categoryValid.reason,
            },
          ],
          totalUpdated: 0,
        };
      }

      const expiryValid = this.validateExpiry(activeTurnover);
      if (!expiryValid.valid) {
        return {
          success: false,
          message: expiryValid.reason,
          betAmount,
          gameDetails: {
            gameId: game._id || gameInput,
            gameName: game.game_name,
            brand: game.brand,
            category: game.category,
          },
          turnovers: [
            {
              turnoverId: activeTurnover._id,
              success: false,
              reason: expiryValid.reason,
            },
          ],
          totalUpdated: 0,
        };
      }

      const completionValid = this.validateCompletion(activeTurnover);
      if (!completionValid.valid) {
        return {
          success: false,
          message: completionValid.reason,
          betAmount,
          gameDetails: {
            gameId: game._id || gameInput,
            gameName: game.game_name,
            brand: game.brand,
            category: game.category,
          },
          turnovers: [
            {
              turnoverId: activeTurnover._id,
              success: false,
              reason: completionValid.reason,
            },
          ],
          totalUpdated: 0,
        };
      }

      // 4. All validations passed - update the active turnover only
      const updateResult = await this.updateTurnoverProgress(
        activeTurnover._id,
        betAmount,
      );

      results.push({
        turnoverId: activeTurnover._id,
        success: updateResult.success,
        ...updateResult,
      });

      // Return results
      const successCount = results.filter((r) => r.success).length;

      return {
        success: successCount > 0,
        message: `Processed ${results.length} turnover records, ${successCount} successful`,
        betAmount,
        gameDetails: {
          gameId: game._id || gameInput,
          gameName: game.game_name,
          brand: game.brand,
          category: game.category,
        },
        turnovers: results,
        totalUpdated: successCount,
      };
    } catch (error) {
      console.error("Record bet error:", {
        message: error.message,
        userId,
        gameId,
        betAmount,
      });

      return {
        success: false,
        message: error.message || "Server error while recording bet",
      };
    }
  }

  /**
   * Validate if provider/brand is allowed
   * @param {Object} turnover - PromotionTurnover document
   * @param {string} gameBrand - Game brand/provider
   * @returns {Object} - Validation result
   */
  async validateProvider(turnover, gameBrand) {
    // If no provider restrictions, allow all
    if (!turnover.allowedProviders || turnover.allowedProviders.length === 0) {
      return { valid: true };
    }

    // Check if game brand is in allowed list
    const normalizeBrand = (b) =>
      String(b || "")
        .trim()
        .toLowerCase()
        .replace(/s$/, "");

    const targetBrand = normalizeBrand(gameBrand);

    const isAllowed = turnover.allowedProviders.some((providerId) => {
      const p = providerId?._id
        ? providerId._id.toString()
        : String(providerId || "");
      if (p === gameBrand) return true;
      if (p.toLowerCase() === String(gameBrand).toLowerCase()) return true;
      return normalizeBrand(p) === targetBrand;
    });

    if (!isAllowed) {
      return {
        valid: false,
        reason: `Game provider "${gameBrand}" is not allowed for this turnover`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate if category is allowed
   * @param {Object} turnover - PromotionTurnover document
   * @param {string} gameCategory - Game category
   * @returns {Object} - Validation result
   */
  async validateCategory(turnover, gameCategory) {
    // If "ALL" is in categories, allow all
    if (
      !turnover.allowedCategories ||
      turnover.allowedCategories.includes("ALL")
    ) {
      return { valid: true };
    }

    // Check if game category is in allowed list
    const isAllowed = turnover.allowedCategories.some(
      (cat) =>
        cat === gameCategory ||
        String(cat).toLowerCase() === String(gameCategory).toLowerCase(),
    );

    if (!isAllowed) {
      return {
        valid: false,
        reason: `Game category "${gameCategory}" is not allowed for this turnover`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate if turnover has expired
   * @param {Object} turnover - PromotionTurnover document
   * @returns {Object} - Validation result
   */
  validateExpiry(turnover) {
    const now = new Date();

    if (turnover.expiresAt && turnover.expiresAt.getTime() < now.getTime()) {
      return {
        valid: false,
        reason: `Turnover expired on ${turnover.expiresAt.toISOString()}`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate if turnover is not already completed
   * @param {Object} turnover - PromotionTurnover document
   * @returns {Object} - Validation result
   */
  validateCompletion(turnover) {
    if (turnover.status === "completed") {
      return {
        valid: false,
        reason: "Turnover is already completed",
      };
    }

    if (turnover.status === "cancelled") {
      return {
        valid: false,
        reason: "Turnover has been cancelled",
      };
    }

    if (turnover.status === "expired") {
      return {
        valid: false,
        reason: "Turnover has expired",
      };
    }

    return { valid: true };
  }

  /**
   * Update turnover progress
   * @param {string} turnoverId - PromotionTurnover ID
   * @param {number} betAmount - Bet amount to add
   * @returns {Object} - Updated turnover status
   */
  async updateTurnoverProgress(turnoverId, betAmount) {
    try {
      const turnover = await PromotionTurnover.findById(turnoverId);

      if (!turnover) {
        return {
          success: false,
          message: "Turnover record not found",
        };
      }

      // Calculate new completed amount (capped at requirement)
      const previousCompleted = turnover.turnoverCompleted;
      turnover.turnoverCompleted = Math.min(
        turnover.turnoverCompleted + betAmount,
        turnover.turnoverRequired,
      );

      // Calculate percentage
      turnover.turnoverPercentage =
        (turnover.turnoverCompleted / turnover.turnoverRequired) * 100;

      // Check if turnover is complete
      const isComplete =
        turnover.turnoverCompleted >= turnover.turnoverRequired;
      if (isComplete) {
        turnover.status = "completed";
        turnover.withdrawLocked = false;
        turnover.completedAt = new Date();
      }

      await turnover.save();

      if (isComplete) {
        // Mark as complete and activate next pending turnover.
        // IMPORTANT: Do NOT automatically move bonus from wallet.bonus -> wallet.main anymore.
        // Claiming must be done explicitly via claim API.
        await this.completeTurnover(
          turnoverId,
          turnover.user,
          turnover.bonusAmount,
        );
      }

      return {
        success: true,
        turnoverId,
        betAmount,
        previousCompleted,
        turnoverCompleted: turnover.turnoverCompleted,
        turnoverRequired: turnover.turnoverRequired,
        remainingTurnover: Math.max(
          0,
          turnover.turnoverRequired - turnover.turnoverCompleted,
        ),
        turnoverPercentage: turnover.turnoverPercentage.toFixed(2),
        isComplete,
        withdrawLocked: turnover.withdrawLocked,
        status: turnover.status,
      };
    } catch (error) {
      console.error("Update turnover progress error:", error);
      return {
        success: false,
        message: error.message || "Failed to update turnover",
      };
    }
  }

  /**
   * Complete turnover - move bonus from wallet.bonus to wallet.main
   * Uses atomic Mongoose operations for data consistency
   *
   * @param {string} turnoverId - PromotionTurnover ID
   * @param {string} userId - User ID
   * @param {number} bonusAmount - Bonus amount to move
   * @returns {Object} - Completion result
   */
  async completeTurnover(turnoverId, userId, bonusAmount) {
    try {
      const User = require("../models/User");
      const UserPromotion = require("../models/UserPromotion");

      const turnover = await PromotionTurnover.findById(turnoverId)
        .select("promotion user bonusAmount")
        .lean();

      if (!turnover) {
        throw new Error("Turnover record not found");
      }

      // Do NOT move funds automatically. Only mark as completed and activate next pending turnover.
      // PromotionTurnover was already marked completed by updateTurnoverProgress.
      await this.activateNextPendingTurnover(userId);

      console.log("Turnover completed (no auto-unlock):", {
        turnoverId,
        userId,
        bonusAmount: bonusAmount,
      });

      return {
        success: true,
        message:
          "Turnover completed. Bonuses are NOT auto-transferred; use claim API to move bonus to main wallet",
        turnoverId,
        userId,
        bonusAmount,
      };
    } catch (error) {
      console.error("Complete turnover error:", {
        message: error.message,
        turnoverId,
        userId,
        bonusAmount,
      });

      return {
        success: false,
        message: error.message || "Failed to complete turnover",
      };
    }
  }

  /**
   * Get user's turnover status
   * @param {string} userId - User ID
   * @returns {Object} - Turnover queue grouped by status
   */
  async getUserTurnoverStatus(userId) {
    try {
      const turnovers = await PromotionTurnover.find({
        user: userId,
      })
        .populate("promotion", "title type promoCode")
        .sort({ createdAt: -1 })
        .lean();

      const formatTurnover = (turnover) => ({
        turnoverId: turnover._id,
        promotion: turnover.promotion,
        status: turnover.status,
        depositAmount: turnover.depositAmount,
        bonusAmount: turnover.bonusAmount,
        turnoverRequired: turnover.turnoverRequired,
        turnoverCompleted: turnover.turnoverCompleted,
        remainingTurnover: Math.max(
          0,
          turnover.turnoverRequired - turnover.turnoverCompleted,
        ),
        turnoverPercentage: turnover.turnoverPercentage.toFixed(2),
        allowedCategories: turnover.allowedCategories,
        allowedProviders: turnover.allowedProviders,
        withdrawLocked: turnover.withdrawLocked,
        expiresAt: turnover.expiresAt,
        completedAt: turnover.completedAt,
        createdAt: turnover.createdAt,
      });

      const activeTurnovers = turnovers
        .filter((turnover) => turnover.status === "active")
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(formatTurnover);
      const pendingTurnovers = turnovers
        .filter((turnover) => turnover.status === "pending")
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .map(formatTurnover);
      const completedTurnovers = turnovers
        .filter((turnover) => turnover.status === "completed")
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(formatTurnover);
      const expiredTurnovers = turnovers
        .filter((turnover) => turnover.status === "expired")
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(formatTurnover);

      return {
        success: true,
        total: turnovers.length,
        activeCount: activeTurnovers.length,
        pendingCount: pendingTurnovers.length,
        completedCount: completedTurnovers.length,
        expiredCount: expiredTurnovers.length,
        turnovers: turnovers.map(formatTurnover),
        activeTurnovers,
        pendingTurnovers,
        completedTurnovers,
        expiredTurnovers,
      };
    } catch (error) {
      console.error("Get user turnover status error:", error);
      return {
        success: false,
        message: error.message || "Failed to fetch turnover status",
      };
    }
  }

  /**
   * Cancel a turnover (admin action)
   * @param {string} turnoverId - PromotionTurnover ID
   * @param {string} reason - Cancellation reason
   * @returns {Object} - Cancellation result
   */
  async cancelTurnover(turnoverId, reason = "Admin cancelled") {
    try {
      const turnover = await PromotionTurnover.findById(turnoverId);

      if (!turnover) {
        return {
          success: false,
          message: "Turnover record not found",
        };
      }

      if (turnover.status !== "active") {
        return {
          success: false,
          message: `Cannot cancel turnover with status: ${turnover.status}`,
        };
      }

      turnover.status = "cancelled";
      turnover.withdrawLocked = false;

      await turnover.save();

      console.log("Turnover cancelled:", {
        turnoverId,
        userId: turnover.user,
        reason,
      });

      return {
        success: true,
        message: "Turnover cancelled successfully",
        turnoverId,
        reason,
      };
    } catch (error) {
      console.error("Cancel turnover error:", error);
      return {
        success: false,
        message: error.message || "Failed to cancel turnover",
      };
    }
  }

  /**
   * Expire old turnovers (run as cron job)
   * @returns {Object} - Expiry results
   */
  async expireOldTurnovers() {
    try {
      const now = new Date();

      const result = await PromotionTurnover.updateMany(
        {
          status: { $in: ["active", "pending"] },
          expiresAt: { $lt: now },
        },
        {
          status: "expired",
          withdrawLocked: false,
        },
      );

      console.log("Turnover expiry check completed:", {
        expiredCount: result.modifiedCount,
      });

      return {
        success: true,
        expiredCount: result.modifiedCount,
      };
    } catch (error) {
      console.error("Expire turnovers error:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Activate the oldest pending turnover for a user
   * @param {string} userId - User ID
   * @returns {Object} - Activation result
   */
  async activateNextPendingTurnover(userId) {
    try {
      const nextPendingTurnover = await PromotionTurnover.findOne({
        user: userId,
        status: "pending",
        expiresAt: { $gt: new Date() },
      }).sort({ createdAt: 1 });

      if (!nextPendingTurnover) {
        return {
          success: true,
          activated: false,
        };
      }

      nextPendingTurnover.status = "active";
      nextPendingTurnover.withdrawLocked = true;
      await nextPendingTurnover.save();

      return {
        success: true,
        activated: true,
        turnoverId: nextPendingTurnover._id,
      };
    } catch (error) {
      console.error("Activate next pending turnover error:", error);
      return {
        success: false,
        message: error.message || "Failed to activate next pending turnover",
      };
    }
  }
}

module.exports = new TurnoverTrackingService();
