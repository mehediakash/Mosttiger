const PromotionTurnover = require("../models/PromotionTurnover");
const ReferralTurnover = require("../models/ReferralTurnover");
const User = require("../models/User");
const {
  canWithdrawWithTurnover,
  logTurnoverValidation,
} = require("../utils/turnoverEligibility");

const getReferralTurnoverLock = (userId) =>
  ReferralTurnover.findOne({
    user: userId,
    status: "active",
    withdrawLocked: true,
  }).lean();

const formatReferralTurnover = (turnover) => ({
  turnoverId: turnover._id,
  status: turnover.status,
  type: "referral",
  bonusAmount: turnover.bonusAmount,
  turnoverRequired: turnover.turnoverRequired,
  turnoverCompleted: turnover.turnoverCompleted,
  remainingTurnover: Math.max(
    0,
    Number(turnover.turnoverRequired || 0) -
      Number(turnover.turnoverCompleted || 0),
  ),
  turnoverPercentage:
    Number(turnover.turnoverRequired || 0) > 0
      ? (
          (Number(turnover.turnoverCompleted || 0) /
            Number(turnover.turnoverRequired || 0)) *
          100
        ).toFixed(2)
      : "0.00",
  withdrawLocked: turnover.withdrawLocked,
  completedAt: turnover.completedAt,
  startedAt: turnover.startedAt,
});

class WithdrawalValidationService {
  /**
   * Validate if user can withdraw
   * Checks:
   * 1. User has no active turnovers
   * 2. Wallet.main has sufficient balance
   * 3. Amount is valid
   *
   * @param {string} userId - User ID
   * @param {number} amount - Withdrawal amount
   * @returns {Object} - Validation result
   */
  async validateWithdrawal(userId, amount) {
    try {
      // Validation: amount is valid
      if (!amount || amount <= 0) {
        return {
          success: false,
          message: "Invalid withdrawal amount",
          canWithdraw: false,
        };
      }

      // 1. Check for active or pending turnovers
      const lockedTurnover = await PromotionTurnover.findOne({
        user: userId,
        status: { $in: ["active", "pending"] },
        expiresAt: { $gt: new Date() },
      }).lean();

      if (lockedTurnover) {
        logTurnoverValidation(lockedTurnover);
      }

      if (lockedTurnover && !canWithdrawWithTurnover(lockedTurnover)) {
        return {
          success: false,
          message: "Complete turnover requirement first",
          canWithdraw: false,
          withdrawalLocked: true,
          lockedBy:
            lockedTurnover.status === "pending"
              ? "PENDING_TURNOVER"
              : "ACTIVE_TURNOVER",
          turnoverDetails: {
            turnoverId: lockedTurnover._id,
            status: lockedTurnover.status,
            remaining: Math.max(
              0,
              lockedTurnover.turnoverRequired -
                lockedTurnover.turnoverCompleted,
            ),
            percentage: lockedTurnover.turnoverPercentage.toFixed(2),
            withdrawLocked: lockedTurnover.withdrawLocked,
            turnoverCompleted: lockedTurnover.turnoverCompleted,
            turnoverRequired: lockedTurnover.turnoverRequired,
            turnoverPercentage: lockedTurnover.turnoverPercentage,
            completedAt: lockedTurnover.completedAt,
            expiresAt: lockedTurnover.expiresAt,
          },
        };
      }

      const lockedReferralTurnover = await getReferralTurnoverLock(userId);
      if (lockedReferralTurnover) {
        return {
          success: false,
          message: "Complete referral turnover requirement first",
          canWithdraw: false,
          withdrawalLocked: true,
          lockedBy: "REFERRAL_TURNOVER",
          turnoverDetails: formatReferralTurnover(lockedReferralTurnover),
        };
      }

      // 2. Check user wallet balance (only main wallet can be withdrawn)
      const user = await User.findById(userId).select("wallet").lean();

      if (!user) {
        return {
          success: false,
          message: "User not found",
          canWithdraw: false,
        };
      }

      const mainBalance = user.wallet?.main || 0;

      if (mainBalance < amount) {
        return {
          success: false,
          message: "Insufficient balance",
          canWithdraw: false,
          availableBalance: mainBalance,
          walletInfo: {
            main: mainBalance,
            bonus: user.wallet?.bonus || 0,
          },
        };
      }

      // All validations passed
      return {
        success: true,
        message: "Withdrawal validation passed",
        canWithdraw: true,
        availableBalance: mainBalance,
        walletInfo: {
          main: mainBalance,
          bonus: user.wallet?.bonus || 0,
        },
      };
    } catch (error) {
      console.error("Withdrawal validation error:", {
        message: error.message,
        userId,
        amount,
      });

      return {
        success: false,
        message: error.message || "Server error validating withdrawal",
        canWithdraw: false,
      };
    }
  }

  /**
   * Check if user's withdrawal is locked due to active turnover
   * Used by frontend to disable withdraw button dynamically
   * Also ensures wallet.bonus is cleared before allowing withdrawal
   *
   * @param {string} userId - User ID
   * @returns {Object} - Lock status
   */
  async checkWithdrawalLock(userId) {
    try {
      const user = await User.findById(userId).select("wallet").lean();
      if (!user) {
        return {
          isLocked: false,
          canWithdraw: true,
        };
      }

      // RULE 1: Check if user has active or pending turnover
      const lockedTurnover = await PromotionTurnover.findOne({
        user: userId,
        status: { $in: ["active", "pending"] },
        expiresAt: { $gt: new Date() },
      })
        .populate("promotion", "title type promoCode")
        .lean();

      if (lockedTurnover) {
        const canWithdraw = logTurnoverValidation(lockedTurnover);

        if (canWithdraw) {
          return {
            isLocked: false,
            canWithdraw: true,
            turnover: {
              turnoverId: lockedTurnover._id,
              status: lockedTurnover.status,
              promotionTitle: lockedTurnover.promotion?.title,
              promotionType: lockedTurnover.promotion?.type,
              depositAmount: lockedTurnover.depositAmount,
              bonusAmount: lockedTurnover.bonusAmount,
              turnoverRequired: lockedTurnover.turnoverRequired,
              turnoverCompleted: lockedTurnover.turnoverCompleted,
              remainingTurnover: 0,
              turnoverPercentage: Math.max(
                Number(lockedTurnover.turnoverPercentage || 0),
                100,
              ).toFixed(2),
              withdrawLocked: lockedTurnover.withdrawLocked,
              completedAt: lockedTurnover.completedAt,
              expiresAt: lockedTurnover.expiresAt,
            },
          };
        }

        return {
          isLocked: true,
          canWithdraw: false,
          message: "Complete turnover requirement first",
          turnover: {
            turnoverId: lockedTurnover._id,
            status: lockedTurnover.status,
            promotionTitle: lockedTurnover.promotion?.title,
            promotionType: lockedTurnover.promotion?.type,
            depositAmount: lockedTurnover.depositAmount,
            bonusAmount: lockedTurnover.bonusAmount,
            turnoverRequired: lockedTurnover.turnoverRequired,
            turnoverCompleted: lockedTurnover.turnoverCompleted,
            remainingTurnover: Math.max(
              0,
              lockedTurnover.turnoverRequired -
                lockedTurnover.turnoverCompleted,
            ),
            turnoverPercentage: lockedTurnover.turnoverPercentage.toFixed(2),
            withdrawLocked: lockedTurnover.withdrawLocked,
            completedAt: lockedTurnover.completedAt,
            expiresAt: lockedTurnover.expiresAt,
          },
        };
      }

      const lockedReferralTurnover = await getReferralTurnoverLock(userId);
      if (lockedReferralTurnover) {
        return {
          isLocked: true,
          canWithdraw: false,
          message: "Complete referral turnover requirement first",
          reason: "REFERRAL_TURNOVER",
          turnover: formatReferralTurnover(lockedReferralTurnover),
        };
      }

      // RULE 2: Additional safety check - if wallet.bonus > 0 after turnover was deleted,
      // still block withdrawal (means turnover completion failed to clear bonus)
      if (user.wallet?.bonus > 0) {
        console.warn(
          "User has positive wallet.bonus without active turnover:",
          {
            userId,
            bonusBalance: user.wallet.bonus,
          },
        );

        return {
          isLocked: true,
          canWithdraw: false,
          message: "Locked promotional balance detected. Contact support.",
          reason: "ORPHANED_BONUS",
          bonusBalance: user.wallet.bonus,
        };
      }

      // No locks - withdrawal allowed
      return {
        isLocked: false,
        canWithdraw: true,
      };
    } catch (error) {
      console.error("Check withdrawal lock error:", error);
      return {
        isLocked: false,
        canWithdraw: true,
        error: error.message,
      };
    }
  }

  /**
   * Get available wallet balance for withdrawal
   * Only wallet.main is withdrawable
   *
   * @param {string} userId - User ID
   * @returns {Object} - Available balance info
   */
  async getAvailableBalance(userId) {
    try {
      const user = await User.findById(userId).select("wallet").lean();

      if (!user) {
        return {
          success: false,
          message: "User not found",
        };
      }

      const mainBalance = user.wallet?.main || 0;
      const bonusBalance = user.wallet?.bonus || 0;

      // Check if withdrawal is locked
      const lockStatus = await this.checkWithdrawalLock(userId);

      return {
        success: true,
        availableForWithdraw: mainBalance,
        wallet: {
          main: mainBalance,
          bonus: bonusBalance,
          total: mainBalance + bonusBalance,
        },
        withdrawalLocked: lockStatus.isLocked,
        lockDetails: lockStatus.isLocked ? lockStatus.turnover : null,
      };
    } catch (error) {
      console.error("Get available balance error:", error);
      return {
        success: false,
        message: error.message || "Failed to fetch available balance",
      };
    }
  }

  /**
   * Validate withdrawal request before processing
   * Comprehensive check including turnover, balance, and amounts
   *
   * @param {string} userId - User ID
   * @param {number} withdrawAmount - Requested withdrawal amount
   * @param {number} processingFee - Processing fee amount
   * @returns {Object} - Comprehensive validation result
   */
  async validateWithdrawalRequest(userId, withdrawAmount, processingFee = 0) {
    try {
      const user = await User.findById(userId).select("wallet").lean();

      if (!user) {
        return {
          valid: false,
          reason: "User not found",
        };
      }

      // 1. Check turnover lock
      const lockStatus = await this.checkWithdrawalLock(userId);
      if (lockStatus.isLocked) {
        return {
          valid: false,
          reason: "Complete turnover requirement first",
          locked: true,
          lockedDetails: lockStatus.turnover,
        };
      }

      // 2. Check amount validity
      if (!withdrawAmount || withdrawAmount <= 0) {
        return {
          valid: false,
          reason: "Invalid withdrawal amount",
        };
      }

      // 3. Check main wallet balance (only main is withdrawable)
      const mainBalance = user.wallet?.main || 0;
      const totalRequired = withdrawAmount + processingFee;

      if (mainBalance < withdrawAmount) {
        return {
          valid: false,
          reason: "Insufficient balance in main wallet",
          availableBalance: mainBalance,
          requestedAmount: withdrawAmount,
          shortfall: withdrawAmount - mainBalance,
        };
      }

      // All checks passed
      return {
        valid: true,
        reason: "Withdrawal validated successfully",
        mainBalance,
        withdrawAmount,
        processingFee,
        totalDeduction: totalRequired,
        remainingBalance: mainBalance - withdrawAmount,
        bonusWalletUntouched: user.wallet?.bonus || 0,
      };
    } catch (error) {
      console.error("Validate withdrawal request error:", error);
      return {
        valid: false,
        reason: error.message || "Server error validating withdrawal",
      };
    }
  }
}

module.exports = new WithdrawalValidationService();
