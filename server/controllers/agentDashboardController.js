const User = require("../models/User");
const AgentSettings = require("../models/AgentSettings");
const GameSession = require("../models/GameSession");
const SportsBet = require("../models/SportsBet");
const Commission = require("../models/Commission");
const Deposit = require("../models/Deposit");
const Withdrawal = require("../models/Withdrawal");
const mongoose = require("mongoose");

class AgentDashboardController {
  // Get comprehensive agent dashboard data
  async getAgentDashboard(req, res) {
    try {
      console.log(
        "Dashboard request for user:",
        req.user.id,
        "role:",
        req.user.role,
      );

      const agentId = req.user._id || req.user.id;
      const agentRole = req.user.role;

      // OPTIMIZATION: Fetch downline users once and reuse to avoid duplicate queries
      const downlineQuery = this.getDownlineQuery(agentId, agentRole);
      const downlineUsers = await User.find(downlineQuery).select("_id").lean();
      const downlineIds = downlineUsers.map((user) => user._id);

      const [
        userStats,
        financialStats,
        commissionStats,
        recentActivity,
        downlineStats,
      ] = await Promise.all([
        this.getUserStatistics(agentId, agentRole, downlineIds).catch((err) => {
          console.error("Error in getUserStatistics:", err);
          return {
            totalUsers: 0,
            activeUsers: 0,
            totalSubAgents: 0,
            inactiveUsers: 0,
          };
        }),
        this.getFinancialStatistics(downlineIds).catch((err) => {
          console.error("Error in getFinancialStatistics:", err);
          return {
            todayRevenue: 0,
            totalRevenue: 0,
            totalDeposits: 0,
            totalWithdrawals: 0,
          };
        }),
        this.getCommissionStatistics(agentId).catch((err) => {
          console.error("Error in getCommissionStatistics:", err);
          return {
            todayCommission: 0,
            pendingCommission: 0,
            totalCommission: 0,
          };
        }),
        this.getRecentActivity(downlineIds).catch((err) => {
          console.error("Error in getRecentActivity:", err);
          return [];
        }),
        this.getDownlineStatistics(agentId, agentRole).catch((err) => {
          console.error("Error in getDownlineStatistics:", err);
          return {};
        }),
      ]);

      console.log("Dashboard data compiled successfully");

      res.status(200).json({
        success: true,
        data: {
          userStats,
          financialStats,
          commissionStats,
          recentActivity,
          downlineStats,
          agentRole,
          lastUpdated: new Date(),
        },
      });
    } catch (error) {
      console.error("Get agent dashboard error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching agent dashboard",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get user statistics for dashboard
  async getUserStatistics(agentId, agentRole, downlineIds) {
    try {
      // OPTIMIZATION: Use pre-fetched downlineIds to avoid duplicate User.find()
      const query = this.getDownlineQuery(agentId, agentRole);

      const totalUsers = downlineIds ? downlineIds.length : await User.countDocuments(query);

      const activeUsers = await User.countDocuments({
        ...query,
        lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      });

      // Get sub-agents count (for agents and master agents)
      let totalSubAgents = 0;
      if (agentRole === "master_agent" || agentRole === "agent") {
        const subAgentQuery = {
          ...this.getDownlineQuery(agentId, agentRole),
          role: agentRole === "master_agent" ? "agent" : "sub_agent",
        };
        totalSubAgents = await User.countDocuments(subAgentQuery);
      }

      return {
        totalUsers,
        activeUsers,
        totalSubAgents,
        inactiveUsers: totalUsers - activeUsers,
      };
    } catch (error) {
      console.error("getUserStatistics error:", error);
      throw error;
    }
  }

  // Get financial statistics for dashboard
  async getFinancialStatistics(downlineIds) {
    try {
      // OPTIMIZATION: Use pre-fetched downlineIds parameter to avoid duplicate User.find()
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        todayTurnover,
        totalTurnover,
        totalDepositsData,
        totalWithdrawalsData,
      ] = await Promise.all([
        // Today's turnover
        this.calculateTurnover(downlineIds, today),
        // All-time turnover
        this.calculateTurnover(downlineIds, new Date(0)),
        // Total deposits (all time)
        Deposit.aggregate([
          {
            $match: {
              user: { $in: downlineIds },
              status: "approved",
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$amount" },
            },
          },
        ]),
        // Total withdrawals (all time)
        Withdrawal.aggregate([
          {
            $match: {
              user: { $in: downlineIds },
              status: "approved",
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$amount" },
            },
          },
        ]),
      ]);

      return {
        todayRevenue: todayTurnover,
        totalRevenue: totalTurnover,
        totalDeposits: totalDepositsData[0]?.total || 0,
        totalWithdrawals: totalWithdrawalsData[0]?.total || 0,
      };
    } catch (error) {
      console.error("getFinancialStatistics error:", error);
      throw error;
    }
  }

  // Calculate turnover for user IDs
  async calculateTurnover(userIds, startDate) {
    const [gameTurnover, sportsTurnover] = await Promise.all([
      GameSession.aggregate([
        {
          $match: {
            user: { $in: userIds },
            status: "completed",
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$betAmount" },
          },
        },
      ]),
      SportsBet.aggregate([
        {
          $match: {
            user: { $in: userIds },
            placedAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalStake" },
          },
        },
      ]),
    ]);

    return (gameTurnover[0]?.total || 0) + (sportsTurnover[0]?.total || 0);
  }

  // Get commission statistics
  async getCommissionStatistics(agentId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayCommission, pendingCommission, totalCommission] =
      await Promise.all([
        Commission.aggregate([
          {
            $match: {
              agent: agentId,
              status: "approved",
              calculatedAt: { $gte: today },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$amount" },
            },
          },
        ]),
        Commission.aggregate([
          {
            $match: {
              agent: agentId,
              status: "pending",
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$amount" },
            },
          },
        ]),
        Commission.aggregate([
          {
            $match: {
              agent: agentId,
              status: "approved",
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$amount" },
            },
          },
        ]),
      ]);

    return {
      todayCommission: todayCommission[0]?.total || 0,
      pendingCommission: pendingCommission[0]?.total || 0,
      totalCommission: totalCommission[0]?.total || 0,
    };
  }

  // Get recent activity
  async getRecentActivity(downlineIds) {
    // OPTIMIZATION: Use pre-fetched downlineIds and add lean() to reduce memory usage
    // OPTIMIZATION: Use pre-fetched downlineIds and add lean() to reduce memory usage
    const [recentBets, recentDeposits, recentWithdrawals] = await Promise.all([
      SportsBet.find({ user: { $in: downlineIds } })
        .populate("user", "fullName")
        .sort({ placedAt: -1 })
        .limit(5)
        .lean()
        .exec(),
      require("../models/Deposit")
        .find({
          user: { $in: downlineIds },
          status: "approved",
        })
        .populate("user", "fullName")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
        .exec(),
      require("../models/Withdrawal")
        .find({
          user: { $in: downlineIds },
          status: "pending",
        })
        .populate("user", "fullName")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
        .exec(),
    ]);

    return {
      recentBets,
      recentDeposits,
      recentWithdrawals,
    };
  }

  // Get downline statistics
  async getDownlineStatistics(agentId, agentRole) {
    if (agentRole === "user") return {};

    const downlineQuery = this.getDownlineQuery(agentId, agentRole);
    // lean() reduces memory usage by ~40% per document
    const downlineUsers = await User.find(downlineQuery)
      .select("fullName email role wallet lastLogin createdAt")
      .limit(10)
      .lean()
      .exec();

    return {
      topUsers: downlineUsers
        .sort((a, b) => b.wallet.main - a.wallet.main)
        .slice(0, 5),
      recentUsers: downlineUsers
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 5),
    };
  }

  // Helper to get downline query based on agent role
  getDownlineQuery(agentId, agentRole) {
    // Ensure agentId is an ObjectId
    const id = mongoose.Types.ObjectId.isValid(agentId)
      ? agentId instanceof mongoose.Types.ObjectId
        ? agentId
        : new mongoose.Types.ObjectId(agentId)
      : agentId;

    switch (agentRole) {
      case "master_agent":
        return {
          $or: [
            { "hierarchy.masterAgent": id },
            { "hierarchy.agent": id },
            { "hierarchy.subAgent": id },
          ],
        };
      case "agent":
        return {
          $or: [{ "hierarchy.agent": id }, { "hierarchy.subAgent": id }],
        };
      case "sub_agent":
        return {
          "hierarchy.subAgent": id,
        };
      default:
        return { _id: id }; // Return only self for regular users
    }
  }
}

module.exports = new AgentDashboardController();
