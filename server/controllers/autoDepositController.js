const PaymentGateway = require("../models/PaymentGateway");

class AutoDepositController {
  // Update payment gateway auto-approval settings
  async updateAutoApprovalSettings(req, res) {
    try {
      const { gatewayId } = req.params;
      const { autoApprove, autoApproveLimit, minDeposit, maxDeposit } =
        req.body;

      const gateway = await PaymentGateway.findByIdAndUpdate(
        gatewayId,
        {
          "settings.autoApprove":
            autoApprove !== undefined ? autoApprove : undefined,
          "settings.autoApproveLimit":
            autoApproveLimit !== undefined ? autoApproveLimit : undefined,
          "settings.minDeposit":
            minDeposit !== undefined ? minDeposit : undefined,
          "settings.maxDeposit":
            maxDeposit !== undefined ? maxDeposit : undefined,
          updatedBy: req.user.id,
        },
        { new: true, runValidators: true },
      );

      if (!gateway) {
        return res.status(404).json({
          success: false,
          message: "Payment gateway not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Auto-approval settings updated successfully",
        data: gateway,
      });
    } catch (error) {
      console.error("Update auto-approval settings error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while updating auto-approval settings",
      });
    }
  }

  // Get all payment gateway settings
  async getPaymentGatewaySettings(req, res) {
    try {
      const gateways = await PaymentGateway.find()
        .select("name type isActive settings supportedCurrencies updatedAt")
        .populate("updatedBy", "fullName email")
        .sort({ updatedAt: -1 });

      res.status(200).json({
        success: true,
        data: gateways,
      });
    } catch (error) {
      console.error("Get payment gateway settings error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching payment gateway settings",
      });
    }
  }

  // Process auto-approval for deposits
  async processAutoApproval() {
    try {
      const Deposit = require("../models/Deposit");
      const WalletService = require("../services/walletService");

      const autoApproveGateways = await PaymentGateway.find({
        "settings.autoApprove": true,
        isActive: true,
      });

      for (const gateway of autoApproveGateways) {
        const pendingDeposits = await Deposit.find({
          paymentMethod: gateway.name,
          status: "pending",
          amount: {
            $lte: gateway.settings.autoApproveLimit || 50000,
            $gte: gateway.settings.minDeposit || 0,
          },
        }).populate("user");

        for (const deposit of pendingDeposits) {
          // Auto-approve deposit
          deposit.status = "approved";
          deposit.approvedBy = null; // System auto-approval
          deposit.approvedAt = new Date();
          deposit.adminNote = "Auto-approved by system";
          await deposit.save();

          // Add funds to user wallet
          await WalletService.updateWallet(
            deposit.user._id,
            deposit.amount,
            "main",
            "deposit",
            {
              description: `Auto-approved deposit via ${gateway.name}`,
              depositId: deposit._id,
            },
          );

          const affiliateTrackingService = require("../services/affiliateTrackingService");
          affiliateTrackingService.recordDepositCompleted(deposit).catch((error) => {
            console.error("Affiliate auto-deposit tracking error:", error);
          });
          const referralService = require("../services/referralService");
          referralService.recordFirstDepositCompleted(deposit).catch((error) => {
            console.error("Referral auto-deposit tracking error:", error);
          });

          // Close all active game sessions when deposit is auto-approved
          const GameSession = require("../models/GameSession");
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
          const socketServer = require("../index").socketServer;
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
                reason: "auto_deposit_approved",
                timestamp: new Date(),
              },
            );
          }

          console.log(
            `Auto-approved deposit ${deposit._id} for user ${deposit.user.email}`,
          );
        }
      }
    } catch (error) {
      console.error("Process auto-approval error:", error);
    }
  }
}

module.exports = new AutoDepositController();
