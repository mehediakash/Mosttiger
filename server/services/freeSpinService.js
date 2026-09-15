const UserPromotion = require("../models/UserPromotion");
const FreeSpinSession = require("../models/FreeSpinSession");
const Game = require("../models/Game");
const User = require("../models/User");
const WalletService = require("./walletService");

class FreeSpinService {
  /**
   * Start a free spin session
   * Validates provider, category, and expiry
   * Does NOT deduct from main wallet
   *
   * @param {string} userId - User ID
   * @param {string} gameId - Game ID
   * @param {number} spins - Number of free spins to use
   * @returns {Object} - Free spin session result
   */
  async startFreeSpinSession(userId, gameId, spins) {
    try {
      // Validation
      if (!userId || !gameId || !spins || spins <= 0) {
        return {
          success: false,
          message: "userId, gameId, and spins (> 0) are required",
        };
      }

      // 1. Fetch game details
      const game = await Game.findById(gameId).lean();
      if (!game) {
        return {
          success: false,
          message: "Game not found",
        };
      }

      // 2. Find active free spin promotion for user
      const userPromotion = await UserPromotion.findOne({
        user: userId,
        status: "active",
        expiresAt: { $gt: new Date() },
        remainingFreeSpins: { $gt: 0 },
      });

      if (!userPromotion) {
        return {
          success: false,
          message: "No active free spin promotion available",
        };
      }

      // Check if enough free spins available
      if (userPromotion.remainingFreeSpins < spins) {
        return {
          success: false,
          message: `Not enough free spins. Available: ${userPromotion.remainingFreeSpins}, Requested: ${spins}`,
          availableSpins: userPromotion.remainingFreeSpins,
        };
      }

      // 3. Validate provider (brand)
      const providerValid = await this.validateProvider(
        userPromotion,
        game.brand,
      );
      if (!providerValid.valid) {
        return {
          success: false,
          message: providerValid.reason,
        };
      }

      // 4. Validate category
      const categoryValid = await this.validateCategory(
        userPromotion,
        game.category,
      );
      if (!categoryValid.valid) {
        return {
          success: false,
          message: categoryValid.reason,
        };
      }

      // 5. Validate expiry
      const expiryValid = this.validateExpiry(userPromotion);
      if (!expiryValid.valid) {
        return {
          success: false,
          message: expiryValid.reason,
        };
      }

      // 6. Create free spin session
      const freeSpinValue = userPromotion.freeSpinValue;
      const totalBetAmount = spins * freeSpinValue;

      const freeSpinSession = new FreeSpinSession({
        user: userId,
        userPromotion: userPromotion._id,
        game: gameId,
        freeSpin: {
          spins,
          value: freeSpinValue,
          totalBetAmount,
        },
        gameBrand: game.brand,
        gameCategory: game.category,
        expiresAt: userPromotion.expiresAt,
        status: "active",
      });

      await freeSpinSession.save();

      // 7. Decrease remaining free spins
      userPromotion.remainingFreeSpins -= spins;
      await userPromotion.save();

      console.log("Free spin session started:", {
        sessionId: freeSpinSession._id,
        userId,
        spins,
        freeSpinValue,
        totalBetAmount,
        promotionId: userPromotion._id,
      });

      return {
        success: true,
        message: "Free spin session started",
        sessionId: freeSpinSession._id,
        sessionData: {
          spins,
          freeSpinValue,
          totalBetAmount,
          gameName: game.game_name,
          brand: game.brand,
          category: game.category,
          remainingSpinsForUser: userPromotion.remainingFreeSpins,
        },
      };
    } catch (error) {
      console.error("Start free spin session error:", {
        message: error.message,
        userId,
        gameId,
        spins,
      });

      return {
        success: false,
        message: error.message || "Failed to start free spin session",
      };
    }
  }

  /**
   * Complete free spin session and record winnings
   * Winnings go to wallet.bonus (NOT main)
   *
   * @param {string} sessionId - FreeSpinSession ID
   * @param {number} winnings - Winning amount
   * @returns {Object} - Completion result
   */
  async completeFreeSpinSession(sessionId, winnings = 0) {
    try {
      // Validation
      if (!sessionId || winnings < 0) {
        return {
          success: false,
          message: "Valid sessionId and winnings (>= 0) are required",
        };
      }

      // 1. Fetch session
      const session = await FreeSpinSession.findById(sessionId);
      if (!session) {
        return {
          success: false,
          message: "Free spin session not found",
        };
      }

      if (session.status !== "active") {
        return {
          success: false,
          message: `Session is already ${session.status}`,
        };
      }

      // 2. Update session with winnings
      session.winnings = winnings;
      session.status = "completed";
      session.completedAt = new Date();
      await session.save();

      // 3. Add winnings to wallet.bonus (NOT main wallet)
      if (winnings > 0) {
        await WalletService.updateWallet(
          session.user,
          winnings,
          "bonus",
          "free_spin_winnings",
          {
            description: `Free spin winnings (${session.freeSpin.spins} spins)`,
            freeSpinSessionId: sessionId,
            gameName: session.gameCategory,
          },
        );
      }

      console.log("Free spin session completed:", {
        sessionId,
        userId: session.user,
        spins: session.freeSpin.spins,
        winnings,
      });

      return {
        success: true,
        message: "Free spin session completed",
        sessionId,
        result: {
          spins: session.freeSpin.spins,
          freeSpinValue: session.freeSpin.value,
          totalBetAmount: session.freeSpin.totalBetAmount,
          winnings,
          walletUpdate: {
            bonusAdded: winnings,
            mainWalletUntouched: true,
          },
        },
      };
    } catch (error) {
      console.error("Complete free spin session error:", {
        message: error.message,
        sessionId,
      });

      return {
        success: false,
        message: error.message || "Failed to complete free spin session",
      };
    }
  }

  /**
   * Cancel a free spin session
   * Returns spins to user and sets session as cancelled
   *
   * @param {string} sessionId - FreeSpinSession ID
   * @returns {Object} - Cancellation result
   */
  async cancelFreeSpinSession(sessionId) {
    try {
      const session = await FreeSpinSession.findById(sessionId);
      if (!session) {
        return {
          success: false,
          message: "Free spin session not found",
        };
      }

      if (session.status !== "active") {
        return {
          success: false,
          message: `Cannot cancel session with status: ${session.status}`,
        };
      }

      // Return spins to user
      const userPromotion = await UserPromotion.findById(session.userPromotion);
      if (userPromotion) {
        userPromotion.remainingFreeSpins += session.freeSpin.spins;
        await userPromotion.save();
      }

      // Cancel session
      session.status = "cancelled";
      await session.save();

      console.log("Free spin session cancelled:", {
        sessionId,
        userId: session.user,
        spinsReturned: session.freeSpin.spins,
      });

      return {
        success: true,
        message: "Free spin session cancelled",
        sessionId,
        spinsReturned: session.freeSpin.spins,
      };
    } catch (error) {
      console.error("Cancel free spin session error:", error);
      return {
        success: false,
        message: error.message || "Failed to cancel free spin session",
      };
    }
  }

  /**
   * Get user's active free spin sessions
   * @param {string} userId - User ID
   * @returns {Object} - Active sessions
   */
  async getUserActiveSessions(userId) {
    try {
      const sessions = await FreeSpinSession.find({
        user: userId,
        status: "active",
        expiresAt: { $gt: new Date() },
      })
        .populate("userPromotion", "promotion")
        .populate("game", "game_name brand category image_url")
        .lean();

      return {
        success: true,
        total: sessions.length,
        sessions: sessions.map((s) => ({
          sessionId: s._id,
          spins: s.freeSpin.spins,
          freeSpinValue: s.freeSpin.value,
          totalBetAmount: s.freeSpin.totalBetAmount,
          gameName: s.game?.game_name,
          brand: s.brand,
          category: s.gameCategory,
          expiresAt: s.expiresAt,
          createdAt: s.createdAt,
        })),
      };
    } catch (error) {
      console.error("Get user active sessions error:", error);
      return {
        success: false,
        message: error.message || "Failed to fetch active sessions",
      };
    }
  }

  /**
   * Validate if provider (brand) is allowed
   * @param {Object} userPromotion - UserPromotion document
   * @param {string} gameBrand - Game brand
   * @returns {Object} - Validation result
   */
  async validateProvider(userPromotion, gameBrand) {
    // If no provider restrictions, allow all
    if (
      !userPromotion.allowedProviders ||
      userPromotion.allowedProviders.length === 0
    ) {
      return { valid: true };
    }

    // Check if game brand is in allowed list
    const isAllowed = userPromotion.allowedProviders.some((providerId) => {
      if (providerId._id) {
        return providerId._id.toString() === gameBrand;
      }
      return providerId.toString() === gameBrand;
    });

    if (!isAllowed) {
      return {
        valid: false,
        reason: `Game provider "${gameBrand}" is not allowed for free spins`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate if category is allowed
   * @param {Object} userPromotion - UserPromotion document
   * @param {string} gameCategory - Game category
   * @returns {Object} - Validation result
   */
  async validateCategory(userPromotion, gameCategory) {
    // If "ALL" is in categories, allow all
    if (
      !userPromotion.allowedCategories ||
      userPromotion.allowedCategories.includes("ALL")
    ) {
      return { valid: true };
    }

    // Check if game category is in allowed list
    const isAllowed = userPromotion.allowedCategories.some(
      (cat) =>
        cat === gameCategory ||
        String(cat).toLowerCase() === String(gameCategory).toLowerCase(),
    );

    if (!isAllowed) {
      return {
        valid: false,
        reason: `Game category "${gameCategory}" is not allowed for free spins`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate if free spin promotion has expired
   * @param {Object} userPromotion - UserPromotion document
   * @returns {Object} - Validation result
   */
  validateExpiry(userPromotion) {
    const now = new Date();

    if (
      userPromotion.expiresAt &&
      userPromotion.expiresAt.getTime() < now.getTime()
    ) {
      return {
        valid: false,
        reason: `Free spin promotion expired on ${userPromotion.expiresAt.toISOString()}`,
      };
    }

    return { valid: true };
  }

  /**
   * Expire old free spin sessions
   * Called as cron job
   */
  async expireOldSessions() {
    try {
      const now = new Date();

      const result = await FreeSpinSession.updateMany(
        {
          status: "active",
          expiresAt: { $lt: now },
        },
        {
          status: "expired",
        },
      );

      console.log("Free spin session expiry check completed:", {
        expiredCount: result.modifiedCount,
      });

      return {
        success: true,
        expiredCount: result.modifiedCount,
      };
    } catch (error) {
      console.error("Expire free spin sessions error:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }
}

module.exports = new FreeSpinService();
