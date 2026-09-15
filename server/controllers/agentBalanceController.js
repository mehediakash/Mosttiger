const User = require("../models/User");
const AgentSettings = require("../models/AgentSettings");
const WalletService = require("../services/walletService");

class AgentBalanceController {
  // Get agent's own wallet balance
  async getMyWalletBalance(req, res) {
    try {
      const agentSettings = await AgentSettings.findOne({ agent: req.user.id });

      if (!agentSettings) {
        return res.status(404).json({
          success: false,
          message: "Agent settings not found",
        });
      }

      res.status(200).json({
        success: true,
        data: {
          wallet: {
            balance: agentSettings.wallet.balance || 0,
            pendingCommission: agentSettings.wallet.pendingCommission || 0,
            totalEarned: agentSettings.wallet.totalEarned || 0,
            totalWithdrawn: agentSettings.wallet.totalWithdrawn || 0,
          },
        },
      });
    } catch (error) {
      console.error("Get my wallet balance error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching wallet balance",
      });
    }
  }

  // Deduct balance from user (Agent deducts from user)
  async deductUserBalance(req, res) {
    try {
      const { userId, amount, walletType = "main", notes } = req.body;

      const agentSettings = await AgentSettings.findOne({ agent: req.user.id });

      if (!agentSettings.permissions.deductBalance) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to deduct balance from users",
        });
      }

      // Verify user is in downline
      const user = await User.findOne({
        _id: userId,
        $or: [
          { "hierarchy.masterAgent": req.user.id },
          { "hierarchy.agent": req.user.id },
          { "hierarchy.subAgent": req.user.id },
        ],
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found in your downline",
        });
      }

      // Check if user has sufficient balance
      if (user.wallet[walletType] < amount) {
        return res.status(400).json({
          success: false,
          message: `User has insufficient balance in ${walletType} wallet`,
        });
      }

      // Deduct from user wallet
      const result = await WalletService.updateWallet(
        userId,
        -amount,
        walletType,
        "agent_deduction",
        {
          description: `Balance deducted by agent: ${notes || "No notes provided"}`,
          deductedBy: req.user.id,
        },
      );

      // Add to agent wallet (optional - depending on business rules)
      agentSettings.wallet.balance += amount;
      await agentSettings.save();

      res.status(200).json({
        success: true,
        message: "Balance deducted successfully",
        data: {
          ...result,
          newAgentBalance: agentSettings.wallet.balance,
        },
      });
    } catch (error) {
      console.error("Deduct user balance error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while deducting user balance",
      });
    }
  }

  // Transfer balance to sub-agent
  async transferToSubAgent(req, res) {
    try {
      const { subAgentId, amount, notes } = req.body;

      const agentSettings = await AgentSettings.findOne({ agent: req.user.id });

      // Check agent wallet balance
      if (agentSettings.wallet.balance < amount) {
        return res.status(400).json({
          success: false,
          message: "Insufficient balance in your agent wallet",
        });
      }

      // Verify sub-agent is in downline
      const subAgent = await User.findOne({
        _id: subAgentId,
        $or: [
          { "hierarchy.masterAgent": req.user.id },
          { "hierarchy.agent": req.user.id },
          { "hierarchy.subAgent": req.user.id },
        ],
        role: { $in: ["agent", "sub_agent"] },
      });

      if (!subAgent) {
        return res.status(404).json({
          success: false,
          message: "Sub-agent not found in your downline",
        });
      }

      const subAgentSettings = await AgentSettings.findOne({
        agent: subAgentId,
      });
      if (!subAgentSettings) {
        return res.status(404).json({
          success: false,
          message: "Sub-agent settings not found",
        });
      }

      // Deduct from agent wallet
      agentSettings.wallet.balance -= amount;
      await agentSettings.save();

      // Add to sub-agent wallet
      subAgentSettings.wallet.balance += amount;
      await subAgentSettings.save();

      // Record transfer
      const AgentTransfer = require("../models/AgentTransfer");
      const transfer = new AgentTransfer({
        fromAgent: req.user.id,
        toUser: subAgentId,
        amount: amount,
        type: "to_sub_agent",
        notes: notes || "",
        status: "completed",
      });

      await transfer.save();

      res.status(200).json({
        success: true,
        message: "Balance transferred to sub-agent successfully",
        data: {
          transferId: transfer._id,
          referenceId: transfer.referenceId,
          amount: amount,
          newAgentBalance: agentSettings.wallet.balance,
          subAgentBalance: subAgentSettings.wallet.balance,
        },
      });
    } catch (error) {
      console.error("Transfer to sub-agent error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while transferring balance to sub-agent",
      });
    }
  }

  // Get agent's transaction history
  async getMyTransactions(req, res) {
    try {
      const Transaction = require("../models/Transaction");
      const AgentTransfer = require("../models/AgentTransfer");

      // Get transactions where agent is involved
      const [transactions, transfers] = await Promise.all([
        Transaction.find({
          $or: [{ user: req.user.id }, { "metadata.agentId": req.user.id }],
        })
          .sort({ createdAt: -1 })
          .limit(50)
          .populate("user", "fullName email")
          .lean(),

        AgentTransfer.find({
          $or: [{ fromAgent: req.user.id }, { toUser: req.user.id }],
        })
          .sort({ createdAt: -1 })
          .limit(50)
          .populate("fromAgent", "fullName email")
          .populate("toUser", "fullName email")
          .lean(),
      ]);

      // Format transactions for response
      const formattedTransactions = transactions.map((tx) => ({
        _id: tx._id,
        type: tx.type,
        amount: tx.amount,
        description: tx.description || `${tx.type} transaction`,
        createdAt: tx.createdAt,
        status: tx.status,
        referenceId: tx.referenceId || tx._id,
      }));

      // Format transfers for response
      const formattedTransfers = transfers.map((transfer) => ({
        _id: transfer._id,
        type: transfer.type,
        amount: transfer.amount,
        description: transfer.notes || `Transfer ${transfer.type}`,
        createdAt: transfer.createdAt,
        status: transfer.status,
        referenceId: transfer.referenceId,
      }));

      // Combine and sort by date
      const allTransactions = [...formattedTransactions, ...formattedTransfers]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 50);

      res.status(200).json({
        success: true,
        data: {
          transactions: allTransactions,
          total: allTransactions.length,
        },
      });
    } catch (error) {
      console.error("Get my transactions error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching transactions",
      });
    }
  }
}

module.exports = new AgentBalanceController();
