const agentService = require("../services/agentService");
const commissionService = require("../services/commissionService");
const User = require("../models/User");
const AgentSettings = require("../models/AgentSettings");
const Commission = require("../models/Commission");

// @desc    Create new agent
// @route   POST /api/agents
// @access  Private (Admin/Master Agent)
exports.createAgent = async (req, res) => {
  try {
    const agentData = req.body;

    // Validate role permissions
    if (!this.canCreateAgent(req.user.role, agentData.role)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to create this type of agent",
      });
    }

    const result = await agentService.createAgent(agentData, req.user._id);

    res.status(201).json({
      success: true,
      message: "Agent created successfully",
      data: result,
    });
  } catch (error) {
    console.error("Create agent error:", error);

    if (error.message.includes("already exists")) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error while creating agent",
    });
  }
};

// Helper function to check creation permissions
exports.canCreateAgent = (userRole, targetRole) => {
  const hierarchy = {
    admin: ["master_agent", "agent", "sub_agent", "user"],
    master_agent: ["agent", "sub_agent", "user"],
    agent: ["sub_agent", "user"],
    sub_agent: ["user"],
  };

  return hierarchy[userRole]?.includes(targetRole) || false;
};

// @desc    Get agent hierarchy
// @route   GET /api/agents/hierarchy
// @access  Private (Agents)
exports.getAgentHierarchy = async (req, res) => {
  try {
    const { depth = 3 } = req.query;

    const hierarchy = await agentService.getAgentHierarchy(
      req.user._id,
      parseInt(depth),
    );

    res.status(200).json({
      success: true,
      data: hierarchy,
    });
  } catch (error) {
    console.error("Get agent hierarchy error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching agent hierarchy",
    });
  }
};

// @desc    Get agent dashboard
// @route   GET /api/agents/dashboard
// @access  Private (Agents)
exports.getAgentDashboard = async (req, res) => {
  try {
    const dashboard = await agentService.getAgentDashboard(req.user._id);

    res.status(200).json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    console.error("Get agent dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching agent dashboard",
    });
  }
};

// @desc    Get agent commission summary
// @route   GET /api/agents/commission-summary
// @access  Private (Agents)
exports.getCommissionSummary = async (req, res) => {
  try {
    const { period = "month" } = req.query;

    const summary = await commissionService.getAgentCommissionSummary(
      req.user._id,
      period,
    );

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Get commission summary error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching commission summary",
    });
  }
};

// @desc    Get agent commission history
// @route   GET /api/agents/commissions
// @access  Private (Agents)
exports.getCommissionHistory = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      startDate,
      endDate,
    } = req.query;

    const query = { agent: req.user._id };

    if (type) query.type = type;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.calculatedAt = {};
      if (startDate) query.calculatedAt.$gte = new Date(startDate);
      if (endDate) query.calculatedAt.$lte = new Date(endDate);
    }

    const commissions = await Commission.find(query)
      .populate("fromUser", "fullName email phone")
      .sort({ calculatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Commission.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        commissions,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total,
      },
    });
  } catch (error) {
    console.error("Get commission history error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching commission history",
    });
  }
};

// @desc    Withdraw commission
// @route   POST /api/agents/withdraw-commission
// @access  Private (Agents)
exports.withdrawCommission = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    const result = await commissionService.withdrawCommission(
      req.user._id,
      amount,
    );

    res.status(200).json({
      success: true,
      message: "Commission withdrawn successfully",
      data: result,
    });
  } catch (error) {
    console.error("Withdraw commission error:", error);

    if (error.message.includes("Insufficient commission balance")) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error while withdrawing commission",
    });
  }
};

// @desc    Get commission withdrawal history
// @route   GET /api/agents/commission-withdrawals
// @access  Private (Agents)
exports.getCommissionWithdrawalHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const result = await commissionService.getCommissionWithdrawalHistory(
      req.user._id,
      {
        page,
        limit,
        status,
      },
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get commission withdrawal history error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching commission withdrawal history",
    });
  }
};

// @desc    Update agent settings
// @route   PUT /api/agents/settings
// @access  Private (Admin/Master Agent)
exports.updateAgentSettings = async (req, res) => {
  try {
    const { agentId } = req.params;
    const updates = req.body;

    // Check if user has permission to update this agent
    if (!(await this.canUpdateAgent(req.user, agentId))) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this agent",
      });
    }

    const result = await agentService.updateAgentSettings(agentId, updates);

    res.status(200).json({
      success: true,
      message: "Agent settings updated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Update agent settings error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating agent settings",
    });
  }
};

// Helper function to check update permissions
exports.canUpdateAgent = async (user, targetAgentId) => {
  if (user.role === "admin") return true;

  const targetAgent = await User.findById(targetAgentId);
  if (!targetAgent) return false;

  // Check hierarchy relationship
  if (user.role === "master_agent") {
    return targetAgent.hierarchy.masterAgent?.toString() === user.id;
  }

  if (user.role === "agent") {
    return targetAgent.hierarchy.agent?.toString() === user.id;
  }

  return false;
};

// @desc    Get downline users
// @route   GET /api/agents/downline
// @access  Private (Agents)
exports.getDownlineUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role = "user" } = req.query;

    // Query users who were referred by this agent
    let query = {
      referredBy: req.user._id,
      role: role,
    };

    if (search) {
      query.$and = [
        {
          $or: [
            { fullName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { phone: { $regex: search, $options: "i" } },
          ],
        },
      ];
    }

    const users = await User.find(query)
      .select(
        "fullName email phone role wallet referenceCode isActive isBlocked createdAt",
      )
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Add statistics for each user
    for (let user of users) {
      user.stats = await agentService.getUserStats(user._id);
    }

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total,
      },
    });
  } catch (error) {
    console.error("Get downline users error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching downline users",
    });
  }
};
