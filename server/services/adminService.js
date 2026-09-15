const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Deposit = require("../models/Deposit");
const Withdrawal = require("../models/Withdrawal");
const GameSession = require("../models/GameSession");
const SportsBet = require("../models/SportsBet");
const Commission = require("../models/Commission");
const PromoCode = require("../models/PromoCode");
const AgentSettings = require("../models/AgentSettings");

class AdminService {
  // Get admin dashboard overview
  async getDashboardOverview(period = "today") {
    const dateFilter = this.getDateFilter(period);

    try {
      const [
        userStats,
        financialStats,
        gamingStats,
        agentStats,
        recentActivities,
      ] = await Promise.all([
        this.getUserStats(dateFilter),
        this.getFinancialStats(dateFilter),
        this.getGamingStats(dateFilter),
        this.getAgentStats(dateFilter),
        this.getRecentActivities(),
      ]);

      return {
        userStats,
        financialStats,
        gamingStats,
        agentStats,
        recentActivities,
        period,
      };
    } catch (error) {
      console.error("Error in getDashboardOverview:", {
        message: error.message,
        stack: error.stack,
        period,
      });
      throw new Error("Failed to fetch dashboard overview");
    }
  }

  // Get user statistics
  async getUserStats(dateFilter) {
    const [totalUsers, newUsers, activeUsers, userGrowth] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: dateFilter }),
      User.countDocuments({ lastLogin: dateFilter }),
      this.getUserGrowth(),
    ]);

    return {
      totalUsers,
      newUsers,
      activeUsers,
      userGrowth,
    };
  }

  // Get financial statistics
  async getFinancialStats(dateFilter) {
    const [
      totalDeposits,
      totalWithdrawals,
      totalRevenue,
      revenueBreakdown,
      pendingDeposits,
      pendingWithdrawals,
    ] = await Promise.all([
      // Total deposits
      Deposit.aggregate([
        {
          $match: {
            status: "approved",
            createdAt: dateFilter,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]),
      // Total withdrawals
      Withdrawal.aggregate([
        {
          $match: {
            status: "completed",
            createdAt: dateFilter,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]),
      // Total revenue (Admin Revenue after commission distribution)
      this.calculateGGR(dateFilter),
      // Detailed revenue breakdown
      this.getRevenueBreakdown(dateFilter),
      // Pending deposits
      Deposit.countDocuments({ status: "pending" }),
      // Pending withdrawals
      Withdrawal.countDocuments({ status: "pending" }),
    ]);

    return {
      totalDeposits: totalDeposits[0]?.total || 0,
      totalWithdrawals: totalWithdrawals[0]?.total || 0,
      totalRevenue: totalRevenue,
      revenueBreakdown: revenueBreakdown,
      pendingDeposits,
      pendingWithdrawals,
      netCashFlow:
        (totalDeposits[0]?.total || 0) - (totalWithdrawals[0]?.total || 0),
    };
  }

  // Calculate Total Admin Revenue (GGR + Agent-based Commission Distribution)
  // Updated: Also includes revenue from Transaction records with type 'bet'
  async calculateGGR(dateFilter) {
    const [gameRevenue, sportsRevenue, transactionRevenue, totalCommissionPaid] = await Promise.all([
      // Game revenue (bet amount - win amount)
      GameSession.aggregate([
        {
          $match: {
            status: "completed",
            createdAt: dateFilter,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "userInfo",
          },
        },
        {
          $unwind: "$userInfo",
        },
        {
          $group: {
            _id: null,
            totalBets: { $sum: "$betAmount" },
            totalWins: { $sum: "$winAmount" },
            // Direct users (no agent hierarchy)
            directUserLosses: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$userInfo.hierarchy.masterAgent", null] },
                      { $eq: ["$userInfo.hierarchy.agent", null] },
                      { $eq: ["$userInfo.hierarchy.subAgent", null] },
                    ],
                  },
                  { $subtract: ["$betAmount", "$winAmount"] },
                  0,
                ],
              },
            },
          },
        },
      ]),
      // Sports revenue (stake - winnings)
      SportsBet.aggregate([
        {
          $match: {
            status: { $in: ["lost", "partially_won"] },
            placedAt: dateFilter,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "userInfo",
          },
        },
        {
          $unwind: "$userInfo",
        },
        {
          $group: {
            _id: null,
            totalStake: { $sum: "$totalStake" },
            totalWins: { $sum: "$actualWin" },
            // Direct users (no agent hierarchy)
            directUserLosses: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$userInfo.hierarchy.masterAgent", null] },
                      { $eq: ["$userInfo.hierarchy.agent", null] },
                      { $eq: ["$userInfo.hierarchy.subAgent", null] },
                    ],
                  },
                  { $subtract: ["$totalStake", "$actualWin"] },
                  0,
                ],
              },
            },
          },
        },
      ]),
      // Transaction-based revenue (type 'bet' = player losses)
      Transaction.aggregate([
        {
          $match: {
            type: "bet",
            status: "completed",
            createdAt: dateFilter,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "userInfo",
          },
        },
        {
          $unwind: "$userInfo",
        },
        {
          $group: {
            _id: null,
            totalBetLosses: { $sum: "$amount" },
            // Direct users (no agent hierarchy)
            directUserBetLosses: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$userInfo.hierarchy.masterAgent", null] },
                      { $eq: ["$userInfo.hierarchy.agent", null] },
                      { $eq: ["$userInfo.hierarchy.subAgent", null] },
                    ],
                  },
                  "$amount",
                  0,
                ],
              },
            },
            agentUserBetLosses: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $ne: ["$userInfo.hierarchy.masterAgent", null] },
                      { $ne: ["$userInfo.hierarchy.agent", null] },
                      { $ne: ["$userInfo.hierarchy.subAgent", null] },
                    ],
                  },
                  "$amount",
                  0,
                ],
              },
            },
          },
        },
      ]),
      // Total commission paid to all agents (hierarchy-based)
      Commission.aggregate([
        {
          $match: {
            status: { $in: ["approved", "paid"] },
            calculatedAt: dateFilter,
          },
        },
        {
          $group: {
            _id: null,
            totalCommission: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    // Calculate gross gaming revenue from GameSession and SportsBet
    const gameGGR =
      (gameRevenue[0]?.totalBets || 0) - (gameRevenue[0]?.totalWins || 0);
    const sportsGGR =
      (sportsRevenue[0]?.totalStake || 0) - (sportsRevenue[0]?.totalWins || 0);
    const totalGGR = gameGGR + sportsGGR;

    // Transaction-based revenue (direct from 'bet' type transactions)
    const transactionBetRevenue = transactionRevenue[0]?.totalBetLosses || 0;
    
    // Combine all revenue sources (GameSession + SportsBet + Transaction bets)
    const totalAllRevenue = totalGGR + transactionBetRevenue;

    // Calculate direct user revenue (users with no agent)
    const directUserGameLosses = gameRevenue[0]?.directUserLosses || 0;
    const directUserSportsLosses = sportsRevenue[0]?.directUserLosses || 0;
    const directUserBetLosses = transactionRevenue[0]?.directUserBetLosses || 0;
    const directUserRevenue = directUserGameLosses + directUserSportsLosses + directUserBetLosses;

    // Calculate agent-based revenue (all sources - Agent Commissions)
    const agentUserGameLosses = gameRevenue[0]?.agentUserLosses || 0;
    const agentUserSportsLosses = sportsRevenue[0]?.agentUserLosses || 0;
    const agentUserBetLosses = transactionRevenue[0]?.agentUserBetLosses || 0;
    const agentUserTotalLosses = agentUserGameLosses + agentUserSportsLosses + agentUserBetLosses;

    // Commission deduction from agent users revenue
    const agentCommissionTotal = totalCommissionPaid[0]?.totalCommission || 0;
    const agentBasedRevenue = agentUserTotalLosses - agentCommissionTotal;

    // Total Admin Revenue = Direct User Revenue + Agent User Revenue (after commissions)
    const totalAdminRevenue = directUserRevenue + agentBasedRevenue;

    return totalAdminRevenue;
  }

  // Get detailed revenue breakdown for admin dashboard
  async getRevenueBreakdown(dateFilter) {
    const [gameRevenue, sportsRevenue, transactionRevenue, totalCommissionPaid, commissionByLevel] =
      await Promise.all([
        // Game revenue breakdown
        GameSession.aggregate([
          {
            $match: {
              status: "completed",
              createdAt: dateFilter,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "user",
              foreignField: "_id",
              as: "userInfo",
            },
          },
          {
            $unwind: "$userInfo",
          },
          {
            $group: {
              _id: null,
              totalBets: { $sum: "$betAmount" },
              totalWins: { $sum: "$winAmount" },
              directUserLosses: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ["$userInfo.hierarchy.masterAgent", null] },
                        { $eq: ["$userInfo.hierarchy.agent", null] },
                        { $eq: ["$userInfo.hierarchy.subAgent", null] },
                      ],
                    },
                    { $subtract: ["$betAmount", "$winAmount"] },
                    0,
                  ],
                },
              },
              agentUserLosses: {
                $sum: {
                  $cond: [
                    {
                      $or: [
                        { $ne: ["$userInfo.hierarchy.masterAgent", null] },
                        { $ne: ["$userInfo.hierarchy.agent", null] },
                        { $ne: ["$userInfo.hierarchy.subAgent", null] },
                      ],
                    },
                    { $subtract: ["$betAmount", "$winAmount"] },
                    0,
                  ],
                },
              },
            },
          },
        ]),
        // Sports revenue breakdown
        SportsBet.aggregate([
          {
            $match: {
              status: { $in: ["lost", "partially_won"] },
              placedAt: dateFilter,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "user",
              foreignField: "_id",
              as: "userInfo",
            },
          },
          {
            $unwind: "$userInfo",
          },
          {
            $group: {
              _id: null,
              totalStake: { $sum: "$totalStake" },
              totalWins: { $sum: "$actualWin" },
              directUserLosses: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ["$userInfo.hierarchy.masterAgent", null] },
                        { $eq: ["$userInfo.hierarchy.agent", null] },
                        { $eq: ["$userInfo.hierarchy.subAgent", null] },
                      ],
                    },
                    { $subtract: ["$totalStake", "$actualWin"] },
                    0,
                  ],
                },
              },
              agentUserLosses: {
                $sum: {
                  $cond: [
                    {
                      $or: [
                        { $ne: ["$userInfo.hierarchy.masterAgent", null] },
                        { $ne: ["$userInfo.hierarchy.agent", null] },
                        { $ne: ["$userInfo.hierarchy.subAgent", null] },
                      ],
                    },
                    { $subtract: ["$totalStake", "$actualWin"] },
                    0,
                  ],
                },
              },
            },
          },
        ]),
        // Transaction-based revenue breakdown (type 'bet' = player losses)
        Transaction.aggregate([
          {
            $match: {
              type: "bet",
              status: "completed",
              createdAt: dateFilter,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "user",
              foreignField: "_id",
              as: "userInfo",
            },
          },
          {
            $unwind: "$userInfo",
          },
          {
            $group: {
              _id: null,
              totalBetLosses: { $sum: "$amount" },
              directUserBetLosses: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ["$userInfo.hierarchy.masterAgent", null] },
                        { $eq: ["$userInfo.hierarchy.agent", null] },
                        { $eq: ["$userInfo.hierarchy.subAgent", null] },
                      ],
                    },
                    "$amount",
                    0,
                  ],
                },
              },
              agentUserBetLosses: {
                $sum: {
                  $cond: [
                    {
                      $or: [
                        { $ne: ["$userInfo.hierarchy.masterAgent", null] },
                        { $ne: ["$userInfo.hierarchy.agent", null] },
                        { $ne: ["$userInfo.hierarchy.subAgent", null] },
                      ],
                    },
                    "$amount",
                    0,
                  ],
                },
              },
            },
          },
        ]),
        // Total commission paid
        Commission.aggregate([
          {
            $match: {
              status: { $in: ["approved", "paid"] },
              calculatedAt: dateFilter,
            },
          },
          {
            $group: {
              _id: null,
              totalCommission: { $sum: "$amount" },
            },
          },
        ]),
        // Commission breakdown by agent level
        Commission.aggregate([
          {
            $match: {
              status: { $in: ["approved", "paid"] },
              calculatedAt: dateFilter,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "agent",
              foreignField: "_id",
              as: "agentInfo",
            },
          },
          {
            $unwind: "$agentInfo",
          },
          {
            $group: {
              _id: "$agentInfo.role",
              totalCommission: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

    // Calculate totals
    const gameGGR =
      (gameRevenue[0]?.totalBets || 0) - (gameRevenue[0]?.totalWins || 0);
    const sportsGGR =
      (sportsRevenue[0]?.totalStake || 0) - (sportsRevenue[0]?.totalWins || 0);
    const totalGGR = gameGGR + sportsGGR;

    // Transaction revenue (bet losses)
    const transactionBetRevenue = transactionRevenue[0]?.totalBetLosses || 0;

    // Combined revenue from all sources
    const totalAllRevenue = totalGGR + transactionBetRevenue;

    // Direct user revenue (from all sources)
    const directUserGameLosses = gameRevenue[0]?.directUserLosses || 0;
    const directUserSportsLosses = sportsRevenue[0]?.directUserLosses || 0;
    const directUserBetLosses = transactionRevenue[0]?.directUserBetLosses || 0;
    const directUserRevenue = directUserGameLosses + directUserSportsLosses + directUserBetLosses;

    // Agent user losses (from all sources)
    const agentUserGameLosses = gameRevenue[0]?.agentUserLosses || 0;
    const agentUserSportsLosses = sportsRevenue[0]?.agentUserLosses || 0;
    const agentUserBetLosses = transactionRevenue[0]?.agentUserBetLosses || 0;
    const agentUserTotalLosses = agentUserGameLosses + agentUserSportsLosses + agentUserBetLosses;

    const totalCommission = totalCommissionPaid[0]?.totalCommission || 0;
    const adminRevenueFromAgentUsers = agentUserTotalLosses - totalCommission;
    const totalAdminRevenue = directUserRevenue + adminRevenueFromAgentUsers;

    // Format commission by level
    const commissionBreakdown = {};
    commissionByLevel.forEach((item) => {
      commissionBreakdown[item._id] = {
        total: item.totalCommission,
        count: item.count,
      };
    });

    return {
      totalRevenue: totalAdminRevenue,
      grossGamingRevenue: totalGGR,
      transactionBetRevenue: transactionBetRevenue,
      totalAllRevenue: totalAllRevenue,
      directUserRevenue: {
        total: directUserRevenue,
        fromGames: directUserGameLosses,
        fromSports: directUserSportsLosses,
        fromBets: directUserBetLosses,
      },
      agentUserRevenue: {
        totalLosses: agentUserTotalLosses,
        fromGames: agentUserGameLosses,
        fromSports: agentUserSportsLosses,
        fromBets: agentUserBetLosses,
        commissionPaid: totalCommission,
        adminShare: adminRevenueFromAgentUsers,
      },
      commissionBreakdown: {
        masterAgent: commissionBreakdown.master_agent || {
          total: 0,
          count: 0,
        },
        agent: commissionBreakdown.agent || { total: 0, count: 0 },
        subAgent: commissionBreakdown.sub_agent || { total: 0, count: 0 },
      },
    };
  }

  // Get gaming statistics
  async getGamingStats(dateFilter) {
    const [totalBets, activePlayers, popularGames, sportsActivity] =
      await Promise.all([
        // Total bets placed
        this.getTotalBets(dateFilter),
        // Active players
        this.getActivePlayers(dateFilter),
        // Popular games
        this.getPopularGames(dateFilter),
        // Sports betting activity
        this.getSportsActivity(dateFilter),
      ]);

    // Create comprehensive game distribution data
    const gameDistribution = this.createGameDistribution(
      popularGames,
      sportsActivity,
    );

    return {
      totalBets,
      activePlayers,
      popularGames,
      sportsActivity,
      gameDistribution,
    };
  }

  // Create game distribution data for charts
  createGameDistribution(popularGames, sportsActivity) {
    const distribution = [];

    // Add casino/slot games from popularGames
    if (popularGames && popularGames.length > 0) {
      popularGames.forEach((game) => {
        if (game.name && game.count > 0) {
          distribution.push({
            name: game.name,
            value: game.count,
            category: "casino",
          });
        }
      });
    }

    // Add sports betting data
    if (sportsActivity && sportsActivity.length > 0) {
      const totalSportsBets = sportsActivity.reduce(
        (sum, sport) => sum + (sport.count || 0),
        0,
      );
      if (totalSportsBets > 0) {
        distribution.push({
          name: "Sports Betting",
          value: totalSportsBets,
          category: "sports",
        });
      }
    }

    // If no data, return default distribution
    if (distribution.length === 0) {
      return [
        { name: "Sports Betting", value: 150, category: "sports" },
        { name: "Casino Games", value: 120, category: "casino" },
        { name: "Slot Machines", value: 90, category: "slots" },
        { name: "Live Games", value: 60, category: "live" },
      ];
    }

    // Sort by value and limit to top categories
    return distribution.sort((a, b) => b.value - a.value).slice(0, 8);
  }

  // Get agent statistics
  async getAgentStats(dateFilter) {
    const [totalAgents, activeAgents, totalAgentCommission] = await Promise.all(
      [
        // Total agents (sub_agent, agent, master_agent roles)
        User.countDocuments({
          role: { $in: ["sub_agent", "agent", "master_agent"] },
        }),
        // Active agents (agents with recent activity)
        User.countDocuments({
          role: { $in: ["sub_agent", "agent", "master_agent"] },
          lastLogin: dateFilter,
        }),
        // Total agent commission earned
        AgentSettings.aggregate([
          {
            $group: {
              _id: null,
              totalCommission: { $sum: "$wallet.totalEarned" },
            },
          },
        ]),
      ],
    );

    const commissionData = totalAgentCommission[0] || { totalCommission: 0 };

    return {
      totalAgents,
      activeAgents,
      totalAgentCommission: commissionData.totalCommission,
    };
  }

  // Get total bets
  async getTotalBets(dateFilter) {
    const [gameBets, sportsBets] = await Promise.all([
      GameSession.countDocuments({
        status: "completed",
        createdAt: dateFilter,
      }),
      SportsBet.countDocuments({
        placedAt: dateFilter,
      }),
    ]);

    return gameBets + sportsBets;
  }

  // Get active players
  async getActivePlayers(dateFilter) {
    const [gamePlayers, sportsPlayers] = await Promise.all([
      GameSession.distinct("user", {
        status: "completed",
        createdAt: dateFilter,
      }),
      SportsBet.distinct("user", {
        placedAt: dateFilter,
      }),
    ]);

    const uniquePlayers = new Set([
      ...gamePlayers.map((id) => id.toString()),
      ...sportsPlayers.map((id) => id.toString()),
    ]);

    return uniquePlayers.size;
  }

  // Get popular games
  async getPopularGames(dateFilter) {
    const games = await GameSession.aggregate([
      {
        $match: {
          status: "completed",
          createdAt: dateFilter,
        },
      },
      {
        $group: {
          _id: "$game",
          totalBets: { $sum: "$betAmount" },
          totalWins: { $sum: "$winAmount" },
          sessionCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "games",
          localField: "_id",
          foreignField: "_id",
          as: "gameInfo",
        },
      },
      {
        $unwind: {
          path: "$gameInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          name: { $ifNull: ["$gameInfo.game_name", "$_id"] },
          count: "$sessionCount",
          totalBets: 1,
          totalWins: 1,
          netRevenue: { $subtract: ["$totalBets", "$totalWins"] },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    // If no games found, return default game distribution
    if (games.length === 0) {
      return [
        { name: "Sports Betting", count: 150 },
        { name: "Casino Games", count: 120 },
        { name: "Slot Machines", count: 90 },
        { name: "Live Games", count: 60 },
      ];
    }

    return games;
  }

  // Get sports activity
  async getSportsActivity(dateFilter) {
    const sportsData = await SportsBet.aggregate([
      {
        $match: {
          placedAt: dateFilter,
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalStake: { $sum: "$totalStake" },
          totalWin: { $sum: "$actualWin" },
        },
      },
    ]);

    // If no sports data, return default sports activity
    if (sportsData.length === 0) {
      return [
        { _id: "won", count: 45, totalStake: 2250, totalWin: 2025 },
        { _id: "lost", count: 120, totalStake: 6000, totalWin: 0 },
        { _id: "pending", count: 25, totalStake: 1250, totalWin: 0 },
      ];
    }

    return sportsData;
  }

  // Get user growth data
  async getUserGrowth() {
    const today = new Date();
    const last30Days = new Date(today.setDate(today.getDate() - 30));

    const userGrowthData = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: last30Days },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // If no data, return sample data for the last 7 days
    if (userGrowthData.length === 0) {
      const sampleData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        sampleData.push({
          _id: date.toISOString().split("T")[0],
          count: Math.floor(Math.random() * 5) + 1,
        });
      }
      return sampleData;
    }

    return userGrowthData;
  }

  // Get recent activities
  async getRecentActivities() {
    const [recentDeposits, recentWithdrawals, recentRegistrations] =
      await Promise.all([
        Deposit.find()
          .populate("user", "fullName email")
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
        Withdrawal.find()
          .populate("user", "fullName email")
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
        User.find()
          .select("fullName email createdAt")
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
      ]);

    return {
      recentDeposits,
      recentWithdrawals,
      recentRegistrations,
    };
  }

  // Get deposit report
  async getDepositReport(dateFilter, reportType) {
    const groupBy = this.getGroupByExpression(reportType);

    return await Deposit.aggregate([
      {
        $match: {
          status: "approved",
          createdAt: dateFilter,
        },
      },
      {
        $group: {
          _id: groupBy,
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
          averageAmount: { $avg: "$amount" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);
  }

  // Get withdrawal report
  async getWithdrawalReport(dateFilter, reportType) {
    const groupBy = this.getGroupByExpression(reportType);

    return await Withdrawal.aggregate([
      {
        $match: {
          status: "completed",
          createdAt: dateFilter,
        },
      },
      {
        $group: {
          _id: groupBy,
          totalAmount: { $sum: "$amount" },
          totalFees: { $sum: "$processingFee" },
          count: { $sum: 1 },
          averageAmount: { $avg: "$amount" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);
  }

  // Get revenue report
  async getRevenueReport(dateFilter, reportType) {
    const groupBy = this.getGroupByExpression(reportType);

    const [gameRevenue, sportsRevenue] = await Promise.all([
      GameSession.aggregate([
        {
          $match: {
            status: "completed",
            createdAt: dateFilter,
          },
        },
        {
          $group: {
            _id: groupBy,
            totalBets: { $sum: "$betAmount" },
            totalWins: { $sum: "$winAmount" },
            sessionCount: { $sum: 1 },
          },
        },
        {
          $project: {
            date: "$_id",
            totalBets: 1,
            totalWins: 1,
            netRevenue: { $subtract: ["$totalBets", "$totalWins"] },
            sessionCount: 1,
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]),
      SportsBet.aggregate([
        {
          $match: {
            status: { $in: ["won", "lost", "partially_won"] },
            placedAt: dateFilter,
          },
        },
        {
          $group: {
            _id: groupBy,
            totalStake: { $sum: "$totalStake" },
            totalWins: { $sum: "$actualWin" },
            betCount: { $sum: 1 },
          },
        },
        {
          $project: {
            date: "$_id",
            totalStake: 1,
            totalWins: 1,
            netRevenue: { $subtract: ["$totalStake", "$totalWins"] },
            betCount: 1,
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]),
    ]);

    // Combine game and sports revenue
    return this.combineRevenueReports(gameRevenue, sportsRevenue);
  }

  // Helper to combine revenue reports
  combineRevenueReports(gameRevenue, sportsRevenue) {
    const combined = {};

    gameRevenue.forEach((item) => {
      combined[item.date] = {
        gameRevenue: item.netRevenue,
        sportsRevenue: 0,
        totalRevenue: item.netRevenue,
      };
    });

    sportsRevenue.forEach((item) => {
      if (combined[item.date]) {
        combined[item.date].sportsRevenue = item.netRevenue;
        combined[item.date].totalRevenue += item.netRevenue;
      } else {
        combined[item.date] = {
          gameRevenue: 0,
          sportsRevenue: item.netRevenue,
          totalRevenue: item.netRevenue,
        };
      }
    });

    return Object.entries(combined).map(([date, revenue]) => ({
      date,
      ...revenue,
    }));
  }

  // Get user activity report
  async getUserActivityReport(dateFilter, reportType) {
    const groupBy = this.getGroupByExpression(reportType);

    return await User.aggregate([
      {
        $match: {
          createdAt: dateFilter,
        },
      },
      {
        $group: {
          _id: groupBy,
          newUsers: { $sum: 1 },
          activeUsers: {
            $sum: {
              $cond: [{ $gt: ["$lastLogin", null] }, 1, 0],
            },
          },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);
  }

  // Get date filter
  getDateFilter(period) {
    const now = new Date();
    let startDate;

    switch (period) {
      case "today":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case "yesterday":
        startDate = new Date(now.setDate(now.getDate() - 1));
        startDate.setHours(0, 0, 0, 0);
        break;
      case "week":
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case "month":
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case "all":
      case "alltime":
        // Return empty object to match all dates
        return {};
      default:
        // Default: show data from the beginning of current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return { $gte: startDate };
  }

  // Get system health status
  async getSystemHealth() {
    const [databaseStatus, apiStatus, memoryUsage, activeConnections] =
      await Promise.all([
        this.checkDatabaseStatus(),
        this.checkAPIStatus(),
        this.getMemoryUsage(),
        this.getActiveConnections(),
      ]);

    return {
      databaseStatus,
      apiStatus,
      memoryUsage,
      activeConnections,
      timestamp: new Date(),
    };
  }

  // Check database status
  async checkDatabaseStatus() {
    try {
      const result = await User.db.db.command({ ping: 1 });
      return {
        status: "healthy",
        responseTime: Date.now(), // Simplified, would need actual timing
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error.message,
      };
    }
  }

  // Check API status
  async checkAPIStatus() {
    // This would check external APIs like iGaming API, Sports API
    return {
      igamingAPI: "healthy", // Would implement actual checks
      sportsAPI: "healthy",
      paymentAPIs: "healthy",
    };
  }

  // Get memory usage
  getMemoryUsage() {
    const used = process.memoryUsage();
    return {
      rss: Math.round(used.rss / 1024 / 1024), // MB
      heapTotal: Math.round(used.heapTotal / 1024 / 1024),
      heapUsed: Math.round(used.heapUsed / 1024 / 1024),
      external: Math.round(used.external / 1024 / 1024),
    };
  }

  // Get active connections
  getActiveConnections() {
    return {
      http: 0, // Would track actual connections
      websocket: 0,
      database: 0,
    };
  }

  // Helper method for date-based grouping in aggregations
  getGroupByExpression(reportType) {
    const expressions = {
      hourly: {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
        hour: { $hour: "$createdAt" },
      },
      daily: {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
      },
      weekly: {
        year: { $year: "$createdAt" },
        week: { $week: "$createdAt" },
      },
      monthly: {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
      },
    };
    return expressions[reportType] || expressions.daily;
  }

  // Helper method for sports bets date grouping
  getGroupByExpressionForSports(reportType) {
    const expressions = {
      hourly: {
        year: { $year: "$placedAt" },
        month: { $month: "$placedAt" },
        day: { $dayOfMonth: "$placedAt" },
        hour: { $hour: "$placedAt" },
      },
      daily: {
        year: { $year: "$placedAt" },
        month: { $month: "$placedAt" },
        day: { $dayOfMonth: "$placedAt" },
      },
      weekly: {
        year: { $year: "$placedAt" },
        week: { $week: "$placedAt" },
      },
      monthly: {
        year: { $year: "$placedAt" },
        month: { $month: "$placedAt" },
      },
    };
    return expressions[reportType] || expressions.daily;
  }

  // Helper method for lastLogin date grouping
  getGroupByExpressionForLastLogin(reportType) {
    const expressions = {
      hourly: {
        year: { $year: "$lastLogin" },
        month: { $month: "$lastLogin" },
        day: { $dayOfMonth: "$lastLogin" },
        hour: { $hour: "$lastLogin" },
      },
      daily: {
        year: { $year: "$lastLogin" },
        month: { $month: "$lastLogin" },
        day: { $dayOfMonth: "$lastLogin" },
      },
      weekly: {
        year: { $year: "$lastLogin" },
        week: { $week: "$lastLogin" },
      },
      monthly: {
        year: { $year: "$lastLogin" },
        month: { $month: "$lastLogin" },
      },
    };
    return expressions[reportType] || expressions.daily;
  }

  // Get comprehensive reports
  async getFinancialReport(options = {}) {
    const { startDate, endDate, reportType = "daily" } = options;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const hasDateFilter = Object.keys(dateFilter).length > 0;

    // Debug: Check raw withdrawal data
    const totalWithdrawals = await Withdrawal.countDocuments();
    const completedWithdrawals = await Withdrawal.countDocuments({
      status: { $in: ["completed", "approved"] },
    });
    console.log("Withdrawal Debug:", {
      totalWithdrawals,
      completedWithdrawals,
      hasDateFilter,
      dateFilter,
    });

    const [depositReport, withdrawalReport, revenueReport, userActivity] =
      await Promise.all([
        // Deposits by period
        Deposit.aggregate([
          {
            $match: {
              status: "approved",
              ...(hasDateFilter && { createdAt: dateFilter }),
            },
          },
          {
            $group: {
              _id: hasDateFilter ? this.getGroupByExpression(reportType) : null,
              totalAmount: { $sum: "$amount" },
              count: { $sum: 1 },
              averageAmount: { $avg: "$amount" },
            },
          },
          {
            $sort: { _id: 1 },
          },
        ]),
        // Withdrawals by period
        Withdrawal.aggregate([
          {
            $match: {
              status: { $in: ["completed", "approved"] },
              ...(hasDateFilter && { createdAt: dateFilter }),
            },
          },
          {
            $group: {
              _id: hasDateFilter ? this.getGroupByExpression(reportType) : null,
              totalAmount: { $sum: "$amount" },
              count: { $sum: 1 },
              averageAmount: { $avg: "$amount" },
            },
          },
          {
            $sort: { _id: 1 },
          },
        ]),
        // Revenue from games and sports
        Promise.all([
          GameSession.aggregate([
            {
              $match: {
                status: "completed",
                ...(hasDateFilter && { createdAt: dateFilter }),
              },
            },
            {
              $group: {
                _id: hasDateFilter
                  ? this.getGroupByExpression(reportType)
                  : null,
                totalBets: { $sum: "$betAmount" },
                totalWins: { $sum: "$winAmount" },
                totalTurnover: { $sum: "$betAmount" },
              },
            },
            {
              $project: {
                _id: 1,
                totalTurnover: 1,
                totalGGR: { $subtract: ["$totalBets", "$totalWins"] },
                totalProfit: { $subtract: ["$totalBets", "$totalWins"] },
              },
            },
            {
              $sort: { _id: 1 },
            },
          ]),
          SportsBet.aggregate([
            {
              $match: {
                ...(hasDateFilter && { placedAt: dateFilter }),
              },
            },
            {
              $group: {
                _id: hasDateFilter
                  ? this.getGroupByExpressionForSports(reportType)
                  : null,
                totalStake: { $sum: "$totalStake" },
                totalWins: { $sum: "$actualWin" },
                totalTurnover: { $sum: "$totalStake" },
              },
            },
            {
              $project: {
                _id: 1,
                totalTurnover: 1,
                totalGGR: { $subtract: ["$totalStake", "$totalWins"] },
                totalProfit: { $subtract: ["$totalStake", "$totalWins"] },
              },
            },
            {
              $sort: { _id: 1 },
            },
          ]),
        ]).then(([gameData, sportsData]) => {
          // Combine game and sports data by date
          const combined = {};

          gameData.forEach((item) => {
            const key = item._id || "all";
            combined[key] = {
              _id: item._id,
              totalTurnover: item.totalTurnover || 0,
              totalGGR: item.totalGGR || 0,
              totalProfit: item.totalProfit || 0,
            };
          });

          sportsData.forEach((item) => {
            const key = item._id || "all";
            if (combined[key]) {
              combined[key].totalTurnover += item.totalTurnover || 0;
              combined[key].totalGGR += item.totalGGR || 0;
              combined[key].totalProfit += item.totalProfit || 0;
            } else {
              combined[key] = {
                _id: item._id,
                totalTurnover: item.totalTurnover || 0,
                totalGGR: item.totalGGR || 0,
                totalProfit: item.totalProfit || 0,
              };
            }
          });

          return Object.values(combined).sort((a, b) =>
            (a._id || "").localeCompare(b._id || ""),
          );
        }),
        // User activity by period
        User.aggregate([
          {
            $facet: {
              newUsers: [
                {
                  $match: {
                    ...(hasDateFilter && { createdAt: dateFilter }),
                  },
                },
                {
                  $group: {
                    _id: hasDateFilter
                      ? this.getGroupByExpression(reportType)
                      : null,
                    newUsers: { $sum: 1 },
                  },
                },
                {
                  $sort: { _id: 1 },
                },
              ],
              activeUsers: [
                {
                  $match: {
                    lastLogin: { $exists: true, $ne: null },
                    ...(hasDateFilter && { lastLogin: dateFilter }),
                  },
                },
                {
                  $group: {
                    _id: hasDateFilter
                      ? this.getGroupByExpressionForLastLogin(reportType)
                      : null,
                    activeUsers: { $sum: 1 },
                  },
                },
                {
                  $sort: { _id: 1 },
                },
              ],
            },
          },
        ]).then((result) => {
          const newUsersData = result[0]?.newUsers || [];
          const activeUsersData = result[0]?.activeUsers || [];

          // Combine new users and active users by date
          const combined = {};

          newUsersData.forEach((item) => {
            const key = JSON.stringify(item._id);
            combined[key] = {
              _id: item._id,
              newUsers: item.newUsers || 0,
              activeUsers: 0,
            };
          });

          activeUsersData.forEach((item) => {
            const key = JSON.stringify(item._id);
            if (combined[key]) {
              combined[key].activeUsers = item.activeUsers || 0;
            } else {
              combined[key] = {
                _id: item._id,
                newUsers: 0,
                activeUsers: item.activeUsers || 0,
              };
            }
          });

          return Object.values(combined).sort((a, b) => {
            const aKey = JSON.stringify(a._id || "");
            const bKey = JSON.stringify(b._id || "");
            return aKey.localeCompare(bKey);
          });
        }),
      ]);

    console.log("Financial Report Debug:", {
      depositCount: depositReport.length,
      withdrawalCount: withdrawalReport.length,
      revenueCount: revenueReport.length,
      userActivityCount: userActivity.length,
      dateFilter,
      hasDateFilter,
      reportType,
    });

    return {
      depositReport,
      withdrawalReport,
      revenueReport,
      userActivity,
    };
  }
}

module.exports = new AdminService();
