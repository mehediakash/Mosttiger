const User = require("../models/User");
const AgentSettings = require("../models/AgentSettings");
const Commission = require("../models/Commission");
const CommissionService = require("./commissionService");
const GameSession = require("../models/GameSession");
const SportsBet = require("../models/SportsBet");
const Deposit = require("../models/Deposit");
const Withdrawal = require("../models/Withdrawal");

class AgentService {
  // Create new agent
  async createAgent(agentData, createdBy) {
    const session = await User.startSession();
    session.startTransaction();

    try {
      const {
        fullName,
        email,
        phone,
        password,
        role,
        commissionRates,
        permissions,
        limits,
      } = agentData;

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email: email.toLowerCase() }, { phone }],
      }).session(session);

      if (existingUser) {
        throw new Error("User already exists with this email or phone");
      }

      // VALIDATION: Commission cannot exceed creator's commission (if not admin)
      if (createdBy) {
        const creatorUser = await User.findById(createdBy).session(session);
        
        // Only validate if creator is not admin
        if (creatorUser && creatorUser.role !== 'admin') {
          const creatorSettings = await AgentSettings.findOne({ 
            agent: createdBy 
          }).session(session);
          
          if (creatorSettings && commissionRates) {
            const parentCommissionRates = creatorSettings.commissionRates || {};
            
            // Check loss commission
            if (commissionRates.loss_commission > parentCommissionRates.loss_commission) {
              throw new Error(
                `Loss commission (${commissionRates.loss_commission}%) cannot exceed creator's commission rate (${parentCommissionRates.loss_commission}%)`
              );
            }

            // Check turnover commission
            if (commissionRates.turnover_commission > parentCommissionRates.turnover_commission) {
              throw new Error(
                `Turnover commission (${commissionRates.turnover_commission}%) cannot exceed creator's commission rate (${parentCommissionRates.turnover_commission}%)`
              );
            }

            // Check profit share
            if (commissionRates.profit_share > parentCommissionRates.profit_share) {
              throw new Error(
                `Profit share (${commissionRates.profit_share}%) cannot exceed creator's profit share (${parentCommissionRates.profit_share}%)`
              );
            }
          }
        }
      }

      // Create agent user
      const agent = new User({
        fullName,
        email: email.toLowerCase(),
        phone,
        password,
        role: role || "agent",
        isEmailVerified: true,
        referredBy: createdBy,
      });

      await agent.save({ session });

      // Create agent settings
      const agentSettings = new AgentSettings({
        agent: agent._id,
        commissionRates: commissionRates || {},
        permissions: permissions || {},
        limits: limits || {},
        createdBy: createdBy,
      });

      await agentSettings.save({ session });

      await session.commitTransaction();
      session.endSession();

      return {
        success: true,
        agent: {
          _id: agent._id,
          fullName: agent.fullName,
          email: agent.email,
          phone: agent.phone,
          role: agent.role,
          referenceCode: agent.referenceCode,
        },
        settings: agentSettings,
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  // Get agent hierarchy tree
  async getAgentHierarchy(agentId, depth = 3) {
    const agent = await User.findById(agentId)
      .select("fullName email phone role referenceCode")
      .populate("hierarchy.masterAgent", "fullName email phone role")
      .populate("hierarchy.agent", "fullName email phone role")
      .populate("hierarchy.subAgent", "fullName email phone role");

    if (!agent) {
      throw new Error("Agent not found");
    }

    const hierarchy = {
      agent: agent,
      downline: await this.getDownlineUsers(agentId, depth),
    };

    return hierarchy;
  }

  // Get downline users recursively
  async getDownlineUsers(agentId, maxDepth, currentDepth = 1) {
    if (currentDepth > maxDepth) return [];

    let query;
    if (currentDepth === 1) {
      query = {
        $or: [
          { "hierarchy.masterAgent": agentId },
          { "hierarchy.agent": agentId },
          { "hierarchy.subAgent": agentId },
        ],
      };
    } else {
      // For deeper levels, we need to traverse the hierarchy
      const parentUsers = await User.find({
        $or: [
          { "hierarchy.masterAgent": agentId },
          { "hierarchy.agent": agentId },
          { "hierarchy.subAgent": agentId },
        ],
      }).select("_id");

      const parentIds = parentUsers.map((user) => user._id);
      if (parentIds.length === 0) return [];

      query = {
        $or: [
          { "hierarchy.masterAgent": { $in: parentIds } },
          { "hierarchy.agent": { $in: parentIds } },
          { "hierarchy.subAgent": { $in: parentIds } },
        ],
      };
    }

    const downlineUsers = await User.find(query)
      .select("fullName email phone role referenceCode wallet createdAt")
      .populate("hierarchy.masterAgent", "fullName email phone")
      .populate("hierarchy.agent", "fullName email phone")
      .populate("hierarchy.subAgent", "fullName email phone")
      .lean();

    // Get additional stats for each user
    for (let user of downlineUsers) {
      user.stats = await this.getUserStats(user._id);

      if (currentDepth < maxDepth) {
        user.downline = await this.getDownlineUsers(
          user._id,
          maxDepth,
          currentDepth + 1,
        );
      }
    }

    return downlineUsers;
  }

  // Get user statistics
  async getUserStats(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [gameStats, betStats, depositStats] = await Promise.all([
      // Game statistics
      GameSession.aggregate([
        {
          $match: {
            user: userId,
            status: "completed",
            createdAt: { $gte: today },
          },
        },
        {
          $group: {
            _id: null,
            totalBets: { $sum: "$betAmount" },
            totalWins: { $sum: "$winAmount" },
            sessionCount: { $sum: 1 },
          },
        },
      ]),
      // Sports bet statistics
      SportsBet.aggregate([
        {
          $match: {
            user: userId,
            placedAt: { $gte: today },
          },
        },
        {
          $group: {
            _id: null,
            totalStake: { $sum: "$totalStake" },
            betCount: { $sum: 1 },
          },
        },
      ]),
      // Deposit statistics
      Deposit.aggregate([
        {
          $match: {
            user: userId,
            status: "approved",
            createdAt: { $gte: today },
          },
        },
        {
          $group: {
            _id: null,
            totalDeposits: { $sum: "$amount" },
            depositCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    return {
      todayBets: gameStats[0]?.totalBets || 0,
      todayWins: gameStats[0]?.totalWins || 0,
      todayStake: betStats[0]?.totalStake || 0,
      todayDeposits: depositStats[0]?.totalDeposits || 0,
      gameSessions: gameStats[0]?.sessionCount || 0,
      betCount: betStats[0]?.betCount || 0,
    };
  }

  // Update agent settings
  async updateAgentSettings(agentId, updates) {
    const agentSettings = await AgentSettings.findOne({ agent: agentId });

    if (!agentSettings) {
      throw new Error("Agent settings not found");
    }

    // Update allowed fields
    const allowedFields = [
      "commissionRates",
      "downlineCommissionRates",
      "limits",
      "permissions",
      "isActive",
    ];

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        agentSettings[field] = updates[field];
      }
    });

    await agentSettings.save();

    return {
      success: true,
      settings: agentSettings,
    };
  }

  // Get agent dashboard data
  async getAgentDashboard(agentId) {
    const [agentSettings, commissionSummary, downlineStats, recentCommissions] =
      await Promise.all([
        AgentSettings.findOne({ agent: agentId }),
        CommissionService.getAgentCommissionSummary(agentId, "today"),
        this.getDownlineStats(agentId),
        Commission.find({ agent: agentId })
          .sort({ calculatedAt: -1 })
          .limit(10)
          .populate("fromUser", "fullName email phone")
          .lean(),
      ]);

    const downlineUsers = await User.countDocuments({
      $or: [
        { "hierarchy.masterAgent": agentId },
        { "hierarchy.agent": agentId },
        { "hierarchy.subAgent": agentId },
      ],
    });

    return {
      wallet: agentSettings?.wallet || {},
      todayCommission: commissionSummary.totalCommission,
      downlineUsers: downlineUsers,
      downlineStats: downlineStats,
      recentCommissions: recentCommissions,
    };
  }

  // Get downline statistics
  async getDownlineStats(agentId) {
    const downlineUsers = await User.find({
      $or: [
        { "hierarchy.masterAgent": agentId },
        { "hierarchy.agent": agentId },
        { "hierarchy.subAgent": agentId },
      ],
    }).select("_id");

    const downlineIds = downlineUsers.map((user) => user._id);

    const [todayTurnover, todayCommission] = await Promise.all([
      // Today's turnover from downline
      this.getDownlineTurnover(downlineIds),
      // Today's commission from downline
      Commission.aggregate([
        {
          $match: {
            agent: agentId,
            fromUser: { $in: downlineIds },
            status: "approved",
            calculatedAt: { $gte: new Date().setHours(0, 0, 0, 0) },
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
      totalUsers: downlineIds.length,
      todayTurnover: todayTurnover,
      todayCommission: todayCommission[0]?.total || 0,
    };
  }

  // Get downline turnover
  async getDownlineTurnover(userIds) {
    const [gameTurnover, sportsTurnover] = await Promise.all([
      GameSession.aggregate([
        {
          $match: {
            user: { $in: userIds },
            status: "completed",
            createdAt: { $gte: new Date().setHours(0, 0, 0, 0) },
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
            placedAt: { $gte: new Date().setHours(0, 0, 0, 0) },
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
}

module.exports = new AgentService();
