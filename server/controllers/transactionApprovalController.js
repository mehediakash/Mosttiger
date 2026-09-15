const Deposit = require("../models/Deposit");
const Withdrawal = require("../models/Withdrawal");
const User = require("../models/User");
const GameSession = require("../models/GameSession");
const WalletService = require("../services/walletService");
const promotionService = require("../services/promotionService");
const affiliateTrackingService = require("../services/affiliateTrackingService");
const referralService = require("../services/referralService");
const AgentSettings = require("../models/AgentSettings");
const Promotion = require("../models/Promotion");

class TransactionApprovalController {
  // Get pending transactions for agent's downline
  async getPendingTransactions(req, res) {
    try {
      const { type, page = 1, limit = 20 } = req.query;

      // Get agent's downline user IDs
      const downlineUsers = await User.find({
        $or: [
          { "hierarchy.masterAgent": req.user.id },
          { "hierarchy.agent": req.user.id },
          { "hierarchy.subAgent": req.user.id },
        ],
      }).select("_id");

      const downlineIds = downlineUsers.map((user) => user._id);

      let Model, transactions;

      if (type === "deposit") {
        Model = Deposit;
      } else if (type === "withdrawal") {
        Model = Withdrawal;
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid transaction type",
        });
      }

      transactions = await Model.find({
        user: { $in: downlineIds },
        status: "pending",
      })
        .populate("user", "fullName email phone")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec();

      const total = await Model.countDocuments({
        user: { $in: downlineIds },
        status: "pending",
      });

      res.status(200).json({
        success: true,
        data: {
          transactions,
          totalPages: Math.ceil(total / limit),
          currentPage: parseInt(page),
          total,
        },
      });
    } catch (error) {
      console.error("Get pending transactions error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching pending transactions",
      });
    }
  }

  // Approve deposit (for agents with permission)
  async approveDeposit(req, res) {
    try {
      const { depositId } = req.params;
      const { notes } = req.body;

      const agentSettings = await AgentSettings.findOne({ agent: req.user.id });

      if (!agentSettings.permissions.approveDeposit) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to approve deposits",
        });
      }

      const deposit = await Deposit.findById(depositId).populate(
        "user",
        "fullName email",
      );

      if (!deposit) {
        return res.status(404).json({
          success: false,
          message: "Deposit not found",
        });
      }

      if (
        deposit.paymentMethod === "payment24x7" ||
        deposit.provider === "payment24x7"
      ) {
        return res.status(400).json({
          success: false,
          message: "Payment24x7 deposits are finalized by gateway callback",
        });
      }

      // Verify deposit belongs to agent's downline
      const isInDownline = await User.findOne({
        _id: deposit.user._id,
        $or: [
          { "hierarchy.masterAgent": req.user.id },
          { "hierarchy.agent": req.user.id },
          { "hierarchy.subAgent": req.user.id },
        ],
      });

      if (!isInDownline) {
        return res.status(403).json({
          success: false,
          message: "This deposit does not belong to your downline",
        });
      }

      // Update deposit status
      if (deposit.promotion) {
        const promotion = await Promotion.findById(deposit.promotion);
        if (promotion) {
          const eligibility =
            await promotionService.validatePromotionEligibility(
              deposit.user._id,
              promotion,
            );

          if (!eligibility.isEligible) {
            return res.status(400).json({
              success: false,
              message: eligibility.reason,
            });
          }
        }
      }

      deposit.status = "approved";
      deposit.approvedBy = req.user.id;
      deposit.approvedAt = new Date();
      deposit.adminNote = notes || "Approved by agent";
      await deposit.save();

      // Add funds to user wallet (main wallet for the deposit amount)
      await WalletService.updateWallet(
        deposit.user._id,
        deposit.amount,
        "main",
        "deposit",
        {
          description: "Deposit approved by agent",
          depositId: deposit._id,
          approvedBy: req.user.id,
        },
      );

      // Apply promotion if deposit has a selected promotion
      if (deposit.promotion) {
        console.log(
          "📊 [APPROVAL] Applying promotion to manual deposit:",
          deposit._id,
        );

        const promotionResult = await promotionService.applyDepositPromotion(
          deposit.user._id.toString(),
          deposit.promotion.toString(),
          Number(deposit.amount || 0),
          deposit._id.toString(),
        );

        if (promotionResult.success) {
          console.log(
            "✅ [APPROVAL] Promotion applied successfully to deposit:",
            deposit._id,
          );
        } else {
          console.warn(
            "⚠️ [APPROVAL] Failed to apply promotion:",
            promotionResult.message,
          );
        }
      }

      affiliateTrackingService.recordDepositCompleted(deposit).catch((error) => {
        console.error("Affiliate deposit tracking error:", error);
      });
      referralService.recordFirstDepositCompleted(deposit).catch((error) => {
        console.error("Referral deposit tracking error:", error);
      });

      // Close all active game sessions when deposit is approved
      const wallet = await WalletService.getWalletBalance(deposit.user._id);
      const currentBalance = wallet.main || 0;

      await GameSession.updateMany(
        { user: deposit.user._id, status: "active" },
        {
          $set: {
            status: "closed",
            endedAt: new Date(),
            endBalance: currentBalance,
          },
        },
      );

      // Emit socket event to notify client about balance update and session closure
      const socketServer = req.app.get("socketServer");
      if (socketServer) {
        socketServer.updateUserBalance(
          deposit.user._id.toString(),
          currentBalance,
        );
        // Also emit custom event for game session closure
        socketServer.sendToUserRoom(
          deposit.user._id.toString(),
          "game_sessions_closed",
          {
            reason: "deposit_approved",
            timestamp: new Date(),
          },
        );
      }

      res.status(200).json({
        success: true,
        message: "Deposit approved successfully",
        data: deposit,
      });
    } catch (error) {
      console.error("Approve deposit error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while approving deposit",
      });
    }
  }

  // Approve withdrawal (for agents with permission)
  async approveWithdrawal(req, res) {
    try {
      const { withdrawalId } = req.params;
      const { notes } = req.body;

      const agentSettings = await AgentSettings.findOne({ agent: req.user.id });

      if (!agentSettings.permissions.approveWithdrawal) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to approve withdrawals",
        });
      }

      const withdrawal = await Withdrawal.findById(withdrawalId).populate(
        "user",
        "fullName email",
      );

      if (!withdrawal) {
        return res.status(404).json({
          success: false,
          message: "Withdrawal not found",
        });
      }

      if (withdrawal.provider === "payment24x7") {
        return res.status(400).json({
          success: false,
          message: "Payment24x7 withdrawals are finalized by gateway callback",
        });
      }

      // Verify withdrawal belongs to agent's downline
      const isInDownline = await User.findOne({
        _id: withdrawal.user._id,
        $or: [
          { "hierarchy.masterAgent": req.user.id },
          { "hierarchy.agent": req.user.id },
          { "hierarchy.subAgent": req.user.id },
        ],
      });

      if (!isInDownline) {
        return res.status(403).json({
          success: false,
          message: "This withdrawal does not belong to your downline",
        });
      }

      // Update withdrawal status
      withdrawal.status = "approved";
      withdrawal.approvedBy = req.user.id;
      withdrawal.approvedAt = new Date();
      withdrawal.adminNote = notes || "Approved by agent";
      await withdrawal.save();

      res.status(200).json({
        success: true,
        message: "Withdrawal approved successfully",
        data: withdrawal,
      });
    } catch (error) {
      console.error("Approve withdrawal error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while approving withdrawal",
      });
    }
  }
}

module.exports = new TransactionApprovalController();
