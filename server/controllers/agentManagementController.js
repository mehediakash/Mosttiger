const User = require("../models/User");
const AgentSettings = require("../models/AgentSettings");
const WalletService = require("../services/walletService");
const mongoose = require("mongoose");
const Counter = require("../models/Counter");

// Helper function to generate sequential userId
async function getNextUserId() {
  const counter = await Counter.findOneAndUpdate(
    { name: "userId" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return counter.seq;
}

class AgentManagementController {
  // Create sub-agent (for agents with permission)
  async createSubAgent(req, res) {
    try {
      const agentSettings = await AgentSettings.findOne({ agent: req.user.id });

      if (!agentSettings.permissions.createSubAgents) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to create sub-agents",
        });
      }

      const {
        fullName,
        email,
        phone,
        password,
        role,
        commissionRates,
        permissions,
        initialBalance = 0,
      } = req.body;

      // Check if agent has sufficient balance if initialBalance is provided
      if (initialBalance > 0) {
        if (
          !agentSettings.wallet ||
          agentSettings.wallet.balance < initialBalance
        ) {
          return res.status(400).json({
            success: false,
            message: `Insufficient balance. You have ${agentSettings.wallet?.balance || 0} but trying to transfer ${initialBalance}`,
          });
        }
      }

      // Validate role hierarchy
      const validRoles = this.getValidSubRoles(req.user.role);
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: `Invalid role for sub-agent. Allowed roles: ${validRoles.join(", ")}`,
        });
      }

      // VALIDATION: Commission cannot exceed parent agent's commission
      const parentCommissionRates = agentSettings.commissionRates || {};
      
      if (commissionRates) {
        // Check loss commission
        if (commissionRates.loss_commission > parentCommissionRates.loss_commission) {
          return res.status(400).json({
            success: false,
            message: `Loss commission (${commissionRates.loss_commission}%) cannot exceed your commission rate (${parentCommissionRates.loss_commission}%)`,
          });
        }

        // Check turnover commission
        if (commissionRates.turnover_commission > parentCommissionRates.turnover_commission) {
          return res.status(400).json({
            success: false,
            message: `Turnover commission (${commissionRates.turnover_commission}%) cannot exceed your commission rate (${parentCommissionRates.turnover_commission}%)`,
          });
        }

        // Check profit share
        if (commissionRates.profit_share > parentCommissionRates.profit_share) {
          return res.status(400).json({
            success: false,
            message: `Profit share (${commissionRates.profit_share}%) cannot exceed your profit share (${parentCommissionRates.profit_share}%)`,
          });
        }
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email: email.toLowerCase() }, { phone }],
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists with this email or phone",
        });
      }

      // Generate unique userId
      const userId = await getNextUserId();

      // Create user
      const user = new User({
        fullName,
        email: email.toLowerCase(),
        phone,
        password,
        userId,
        role: role || "sub_agent",
        hierarchy: {
          masterAgent: req.user.hierarchy?.masterAgent || req.user.id,
          agent:
            req.user.role === "agent" ? req.user.id : req.user.hierarchy?.agent,
          subAgent: req.user.role === "sub_agent" ? req.user.id : null,
        },
        isEmailVerified: true,
        referredBy: req.user.id,
      });

      await user.save();

      // Set default permissions for agent role
      let finalPermissions = {};
      
      // If role is 'agent', ALWAYS ensure default permissions are set (these cannot be disabled)
      if (role === 'agent') {
        finalPermissions = {
          // User Management - MANDATORY for agents
          addUser: true,
          editUser: true,
          viewUsers: true,
          resetUserPassword: true,
          
          // Commission Management - MANDATORY for agents
          viewCommission: true,
          withdrawCommission: true,
          
          // Reports & Analytics - MANDATORY for agents
          viewTransactions: true,
          viewUserBets: true,
          viewReports: true,
          
          // Merge with any additional permissions sent from frontend
          // Note: The above mandatory permissions will always be true even if frontend sends false
          ...(permissions || {}),
          
          // Re-apply mandatory permissions to ensure they can't be overridden
          addUser: true,
          editUser: true,
          viewUsers: true,
          resetUserPassword: true,
          viewCommission: true,
          withdrawCommission: true,
          viewTransactions: true,
          viewUserBets: true,
          viewReports: true,
        };
      } else {
        // For master_agent and sub_agent, use permissions as sent
        finalPermissions = permissions || {};
      }

      // Create agent settings
      const subAgentSettings = new AgentSettings({
        agent: user._id,
        commissionRates: commissionRates || {},
        permissions: finalPermissions,
        parentAgent: req.user.id,
        level: this.getAgentLevel(role),
        createdBy: req.user.id,
        wallet: {
          balance: initialBalance || 0,
          pendingCommission: 0,
          totalEarned: 0,
          totalWithdrawn: 0,
        },
      });

      await subAgentSettings.save();

      // Transfer balance if initialBalance is provided
      if (initialBalance > 0) {
        // Deduct from parent agent's wallet
        agentSettings.wallet.balance -= initialBalance;
        await agentSettings.save();

        // Create transaction records
        const Transaction = require("../models/Transaction");

        // Get parent agent user for transaction
        const parentAgent = await User.findById(req.user.id);
        const parentPreviousBalance = parentAgent.wallet.main;

        // Debit transaction for parent agent
        await Transaction.create({
          user: req.user.id,
          type: "transfer",
          amount: initialBalance,
          walletType: "main",
          previousBalance: parentPreviousBalance,
          newBalance: parentPreviousBalance, // Agent wallet is in AgentSettings
          status: "completed",
          description: `Balance transferred to sub-agent ${user.fullName}`,
          relatedUser: user._id,
          processedBy: req.user.id,
        });

        // Credit transaction for sub-agent
        await Transaction.create({
          user: user._id,
          type: "transfer",
          amount: initialBalance,
          walletType: "main",
          previousBalance: 0,
          newBalance: initialBalance,
          status: "completed",
          description: `Balance received from ${req.user.fullName}`,
          relatedUser: req.user.id,
          processedBy: req.user.id,
        });
      }

      res.status(201).json({
        success: true,
        message: "Sub-agent created successfully",
        data: {
          agent: {
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            role: user.role,
            referenceCode: user.referenceCode,
          },
          settings: subAgentSettings,
          balanceTransferred: initialBalance,
          remainingBalance: agentSettings.wallet.balance,
        },
      });
    } catch (error) {
      console.error("Create sub-agent error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while creating sub-agent",
      });
    }
  }

  // Get valid sub-roles based on current agent role
  getValidSubRoles(role) {
    const roleHierarchy = {
      master_agent: ["agent", "sub_agent", "user"],
      agent: ["sub_agent", "user"],
      sub_agent: ["agent", "user"],
    };
    return roleHierarchy[role] || ["user"];
  }

  // Get agent level from role
  getAgentLevel(role) {
    const levelMap = {
      master_agent: 1,
      agent: 2,
      sub_agent: 3,
      user: 4,
    };
    return levelMap[role] || 4;
  }

  // Get downline agents
  async getDownlineAgents(req, res) {
    try {
      const { page = 1, limit = 20, role, search } = req.query;

      // Base query: get all users/agents referred by this agent
      let query = {
        referredBy: req.user.id,
      };

      // Filter by role
      if (role) {
        // Handle comma-separated roles (e.g., "agent,sub_agent")
        const roles = role.split(",").map((r) => r.trim());
        if (roles.length > 1) {
          query.role = { $in: roles };
        } else {
          query.role = role;
        }
      } else {
        // Default: show agents and sub-agents only (not users)
        query.role = { $in: ["master_agent", "agent", "sub_agent"] };
      }

      // Search filter
      if (search) {
        query.$and = [
          { referredBy: req.user.id },
          {
            $or: [
              { fullName: { $regex: search, $options: "i" } },
              { email: { $regex: search, $options: "i" } },
              { phone: { $regex: search, $options: "i" } },
            ],
          },
        ];
      }

      const agents = await User.find(query)
        .select(
          "fullName email phone role referenceCode wallet createdAt lastLogin isActive",
        )
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

      // Add agent settings and statistics
      for (let agent of agents) {
        const settings = await AgentSettings.findOne({ agent: agent._id });
        agent.settings = settings;
        agent.stats = await this.getAgentStats(agent._id);
      }

      const total = await User.countDocuments(query);

      res.status(200).json({
        success: true,
        data: {
          agents,
          totalPages: Math.ceil(total / limit),
          currentPage: parseInt(page),
          total,
        },
      });
    } catch (error) {
      console.error("Get downline agents error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching downline agents",
      });
    }
  }

  // Add balance to user (for agents with permission)
  async addUserBalance(req, res) {
    try {
      const { userId, amount, walletType = "main", note } = req.body;

      const agentSettings = await AgentSettings.findOne({ agent: req.user.id });

      if (!agentSettings.permissions.addBalance) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to add balance to users",
        });
      }

      // Check if user is in agent's downline
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

      // Add balance
      const result = await WalletService.updateWallet(
        userId,
        amount,
        walletType,
        "agent_credit",
        {
          description: `Balance added by agent: ${note || "No note provided"}`,
          addedBy: req.user.id,
        },
      );

      res.status(200).json({
        success: true,
        message: "Balance added successfully",
        data: result,
      });
    } catch (error) {
      console.error("Add user balance error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while adding user balance",
      });
    }
  }

  // Get agent permissions
  async getAgentPermissions(req, res) {
    try {
      const agentSettings = await AgentSettings.findOne({ agent: req.user.id });

      res.status(200).json({
        success: true,
        data: agentSettings?.permissions || {},
      });
    } catch (error) {
      console.error("Get agent permissions error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching permissions",
      });
    }
  }

  // Update sub-agent commission rates
  async updateSubAgentCommission(req, res) {
    try {
      const { subAgentId } = req.params;
      const { commissionRates } = req.body;

      const agentSettings = await AgentSettings.findOne({ agent: req.user.id });

      if (!agentSettings.permissions.setSubAgentCommission) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to set sub-agent commissions",
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
      });

      if (!subAgent) {
        return res.status(404).json({
          success: false,
          message: "Sub-agent not found in your downline",
        });
      }

      // VALIDATION: Commission cannot exceed parent agent's commission
      const parentCommissionRates = agentSettings.commissionRates || {};
      
      // Check loss commission
      if (commissionRates.loss_commission > parentCommissionRates.loss_commission) {
        return res.status(400).json({
          success: false,
          message: `Loss commission (${commissionRates.loss_commission}%) cannot exceed your commission rate (${parentCommissionRates.loss_commission}%)`,
        });
      }

      // Check turnover commission
      if (commissionRates.turnover_commission > parentCommissionRates.turnover_commission) {
        return res.status(400).json({
          success: false,
          message: `Turnover commission (${commissionRates.turnover_commission}%) cannot exceed your commission rate (${parentCommissionRates.turnover_commission}%)`,
        });
      }

      // Check profit share
      if (commissionRates.profit_share > parentCommissionRates.profit_share) {
        return res.status(400).json({
          success: false,
          message: `Profit share (${commissionRates.profit_share}%) cannot exceed your profit share (${parentCommissionRates.profit_share}%)`,
        });
      }

      const subAgentSettings = await AgentSettings.findOneAndUpdate(
        { agent: subAgentId },
        { commissionRates },
        { new: true },
      );

      res.status(200).json({
        success: true,
        message: "Sub-agent commission rates updated successfully",
        data: subAgentSettings,
      });
    } catch (error) {
      console.error("Update sub-agent commission error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while updating sub-agent commission",
      });
    }
  }

  // Get agent statistics
  async getAgentStats(agentId) {
    try {
      // Get downline users count
      const downlineUsers = await User.countDocuments({
        $or: [
          { "hierarchy.masterAgent": agentId },
          { "hierarchy.agent": agentId },
          { "hierarchy.subAgent": agentId },
        ],
      });

      // Get direct sub-agents count
      const subAgents = await User.countDocuments({
        $or: [
          { "hierarchy.masterAgent": agentId },
          { "hierarchy.agent": agentId },
          { "hierarchy.subAgent": agentId },
        ],
        role: { $in: ["agent", "sub_agent"] },
      });

      // Get commission info
      const agentSettings = await AgentSettings.findOne({ agent: agentId });

      return {
        downlineUsers,
        subAgents,
        commissionEarned: agentSettings?.wallet?.totalEarned || 0,
        pendingCommission: agentSettings?.wallet?.pendingCommission || 0,
      };
    } catch (error) {
      console.error("Get agent stats error:", error);
      return {
        downlineUsers: 0,
        subAgents: 0,
        commissionEarned: 0,
        pendingCommission: 0,
      };
    }
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
        return { _id: id };
    }
  }
}

module.exports = new AgentManagementController();
