const User = require("../models/User");
const AgentSettings = require("../models/AgentSettings");
const Commission = require("../models/Commission");
const PermissionTemplate = require("../models/PermissionTemplate");
const getNextUserId = require("../utils/getNextUserId");

class AdminManagementController {
  // Create master agent (admin only)
  async createMasterAgent(req, res) {
    try {
      const {
        fullName,
        email,
        phone,
        password,
        commissionRates,
        limits,
        permissions,
        role = "master_agent",
      } = req.body;

      // Validate role
      const validRoles = ["master_agent", "agent", "sub_agent"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: `Invalid role. Must be one of: ${validRoles.join(", ")}`,
        });
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

      // Create agent user with specified role
      const nextUserId = await getNextUserId();

      const user = new User({
        fullName,
        email: email.toLowerCase(),
        phone,
        password,
        role: role,
        isEmailVerified: true,
        userId: nextUserId,
      });

      await user.save();

      // Create agent settings
      const agentSettings = new AgentSettings({
        agent: user._id,
        commissionRates: commissionRates || {
          loss_commission: 10,
          turnover_commission: 5,
          profit_share: 0,
        },
        permissions: permissions || {
          addUser: true,
          editUser: true,
          viewUsers: true,
          resetUserPassword: true,
          addBalance: true,
          deductBalance: true,
          adjustBalance: true,
          approveDeposit: false,
          approveWithdrawal: false,
          viewTransactions: true,
          viewUserBets: true,
          cancelBets: false,
          createSubAgents: true,
          viewSubAgents: true,
          setSubAgentCommission: true,
          viewCommission: true,
          withdrawCommission: true,
          viewReports: true,
        },
        limits: limits || {
          maxUsers: 1000,
          maxDeposit: 100000,
          maxWithdrawal: 50000,
          creditLimit: 50000,
        },
        level: 1,
        createdBy: req.user.id,
      });

      await agentSettings.save();

      res.status(201).json({
        success: true,
        message: `${role.replace("_", " ")} created successfully`,
        data: {
          agent: {
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            role: user.role,
            referenceCode: user.referenceCode,
          },
          settings: agentSettings,
        },
      });
    } catch (error) {
      console.error("Create agent error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while creating agent",
      });
    }
  }

  // Update agent permissions (admin only)
  async updateAgentPermissions(req, res) {
    try {
      const { agentId } = req.params;
      const { permissions, limits, isActive, isSuspended } = req.body;

      // Validate agentId
      if (!agentId) {
        return res.status(400).json({
          success: false,
          message: "Agent ID is required",
        });
      }

      // Update AgentSettings
      const updateData = {
        permissions: permissions || {},
        limits: limits || {},
      };

      // Only update status fields if they are provided
      if (isActive !== undefined) {
        updateData.isActive = isActive;
      }
      if (isSuspended !== undefined) {
        updateData.isSuspended = isSuspended;
      }

      const agentSettings = await AgentSettings.findOneAndUpdate(
        { agent: agentId },
        updateData,
        { new: true, runValidators: true },
      ).populate("agent", "fullName email phone role");

      if (!agentSettings) {
        return res.status(404).json({
          success: false,
          message: "Agent settings not found",
        });
      }

      // Also update the User document with status changes
      const userUpdateData = {};
      if (isActive !== undefined) {
        userUpdateData.isActive = isActive;
      }
      if (isSuspended !== undefined) {
        userUpdateData.isSuspended = isSuspended;
      }

      if (Object.keys(userUpdateData).length > 0) {
        await User.findByIdAndUpdate(agentId, userUpdateData, { new: true });
      }

      res.status(200).json({
        success: true,
        message: "Agent permissions updated successfully",
        data: agentSettings,
      });
    } catch (error) {
      console.error("Update agent permissions error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while updating agent permissions",
        error: error.message,
      });
    }
  }

  // Get agent hierarchy tree (admin only)
  getAgentHierarchyTree = async (req, res) => {
    try {
      const { agentId } = req.params;

      const hierarchy = await this.buildHierarchyTree(agentId);

      res.status(200).json({
        success: true,
        data: hierarchy,
      });
    } catch (error) {
      console.error("Get agent hierarchy tree error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching agent hierarchy",
      });
    }
  };

  // Build hierarchy tree recursively
  buildHierarchyTree = async (agentId, depth = 0, maxDepth = 5) => {
    if (depth > maxDepth) return null;

    const agent = await User.findById(agentId)
      .select("fullName email phone role referenceCode wallet createdAt")
      .lean();

    if (!agent) return null;

    const settings = await AgentSettings.findOne({ agent: agentId });
    agent.settings = settings;

    // Get direct downline
    const downlineQuery = {
      $or: [
        { "hierarchy.masterAgent": agentId },
        { "hierarchy.agent": agentId },
        { "hierarchy.subAgent": agentId },
      ],
      _id: { $ne: agentId }, // Exclude self
    };

    const downlineAgents = await User.find(downlineQuery)
      .select("fullName email phone role referenceCode")
      .lean();

    // Build tree recursively
    agent.downline = [];
    for (let downlineAgent of downlineAgents) {
      const downlineTree = await this.buildHierarchyTree(
        downlineAgent._id,
        depth + 1,
        maxDepth,
      );
      if (downlineTree) {
        agent.downline.push(downlineTree);
      }
    }

    return agent;
  };

  // Get system-wide commission report (admin only)
  async getCommissionReport(req, res) {
    try {
      const { startDate, endDate, agentId, type } = req.query;

      const matchStage = { status: "approved" };

      if (startDate || endDate) {
        matchStage.calculatedAt = {};
        if (startDate) matchStage.calculatedAt.$gte = new Date(startDate);
        if (endDate) matchStage.calculatedAt.$lte = new Date(endDate);
      }

      if (agentId) matchStage.agent = agentId;
      if (type) matchStage.type = type;

      const commissionReport = await Commission.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              agent: "$agent",
              type: "$type",
              date: {
                $dateToString: { format: "%Y-%m-%d", date: "$calculatedAt" },
              },
            },
            totalAmount: { $sum: "$amount" },
            transactionCount: { $sum: 1 },
            uniqueUsers: { $addToSet: "$fromUser" },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "_id.agent",
            foreignField: "_id",
            as: "agentInfo",
          },
        },
        {
          $unwind: "$agentInfo",
        },
        {
          $project: {
            date: "$_id.date",
            agent: {
              _id: "$agentInfo._id",
              fullName: "$agentInfo.fullName",
              email: "$agentInfo.email",
              role: "$agentInfo.role",
            },
            type: "$_id.type",
            totalAmount: 1,
            transactionCount: 1,
            uniqueUserCount: { $size: "$uniqueUsers" },
          },
        },
        { $sort: { date: -1, totalAmount: -1 } },
      ]);

      res.status(200).json({
        success: true,
        data: commissionReport,
      });
    } catch (error) {
      console.error("Get commission report error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while generating commission report",
      });
    }
  }

  // Freeze/Unfreeze agent account (admin only)
  async toggleAgentStatus(req, res) {
    try {
      const { agentId } = req.params;
      const { isSuspended, reason } = req.body;

      const agentSettings = await AgentSettings.findOneAndUpdate(
        { agent: agentId },
        {
          isSuspended: isSuspended !== undefined ? isSuspended : undefined,
          suspensionReason: reason || null,
        },
        { new: true },
      ).populate("agent", "fullName email phone role");

      if (!agentSettings) {
        return res.status(404).json({
          success: false,
          message: "Agent not found",
        });
      }

      res.status(200).json({
        success: true,
        message: `Agent ${isSuspended ? "suspended" : "activated"} successfully`,
        data: agentSettings,
      });
    } catch (error) {
      console.error("Toggle agent status error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while updating agent status",
      });
    }
  }

  // Get all permission templates
  async getPermissionTemplates(req, res) {
    try {
      const { role } = req.query;

      const query = { isActive: true };
      if (role) {
        query.role = role;
      }

      const templates = await PermissionTemplate.find(query)
        .populate("createdBy", "fullName")
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        data: {
          templates,
        },
      });
    } catch (error) {
      console.error("Get permission templates error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching permission templates",
      });
    }
  }

  // Create permission template
  async createPermissionTemplate(req, res) {
    try {
      const templateData = {
        ...req.body,
        createdBy: req.user._id,
      };

      const template = await PermissionTemplate.create(templateData);

      res.status(201).json({
        success: true,
        data: template,
        message: "Permission template created successfully",
      });
    } catch (error) {
      console.error("Create permission template error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while creating permission template",
      });
    }
  }

  // Update permission template
  async updatePermissionTemplate(req, res) {
    try {
      const { templateId } = req.params;

      const template = await PermissionTemplate.findByIdAndUpdate(
        templateId,
        req.body,
        { new: true, runValidators: true },
      );

      if (!template) {
        return res.status(404).json({
          success: false,
          message: "Permission template not found",
        });
      }

      res.status(200).json({
        success: true,
        data: template,
        message: "Permission template updated successfully",
      });
    } catch (error) {
      console.error("Update permission template error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while updating permission template",
      });
    }
  }

  // Delete permission template
  async deletePermissionTemplate(req, res) {
    try {
      const { templateId } = req.params;

      const template = await PermissionTemplate.findByIdAndUpdate(
        templateId,
        { isActive: false },
        { new: true },
      );

      if (!template) {
        return res.status(404).json({
          success: false,
          message: "Permission template not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Permission template deleted successfully",
      });
    } catch (error) {
      console.error("Delete permission template error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while deleting permission template",
      });
    }
  }

  // Create agent with permissions
  async createAgentWithPermissions(req, res) {
    try {
      const {
        fullName,
        email,
        phone,
        password,
        role,
        permissions,
        limits,
        commissionRates,
        templateId,
      } = req.body;

      // If templateId is provided, use template permissions
      let agentPermissions = permissions;
      let agentLimits = limits;
      let agentCommissionRates = commissionRates;

      if (templateId) {
        const template = await PermissionTemplate.findById(templateId);
        if (template) {
          agentPermissions = template.permissions;
          agentLimits = template.limits;
          agentCommissionRates = template.commissionRates;
        }
      }

      // Create the agent user
      const nextUserId = await getNextUserId();
      const agent = await User.create({
        fullName,
        email,
        phone,
        password,
        role,
        userId: nextUserId,
        isActive: true,
      });

      // Create agent settings
      const agentSettings = await AgentSettings.create({
        agent: agent._id,
        commissionRates: agentCommissionRates,
        downlineCommissionRates: {},
        wallet: {
          balance: 0,
          pendingCommission: 0,
          totalEarned: 0,
          totalWithdrawn: 0,
        },
        limits: agentLimits,
        permissions: agentPermissions,
        createdBy: req.user._id,
      });

      // Set up hierarchy based on role
      if (role === "master_agent") {
        agent.hierarchy = { masterAgent: null, agent: null, subAgent: null };
      } else if (role === "agent") {
        // For now, set master agent as the creator (admin)
        // This should be configurable in a real implementation
        agent.hierarchy = {
          masterAgent: req.user._id,
          agent: null,
          subAgent: null,
        };
      } else if (role === "sub_agent") {
        // Similar logic for sub agents
        agent.hierarchy = {
          masterAgent: req.user._id,
          agent: req.user._id,
          subAgent: null,
        };
      }

      await agent.save();

      res.status(201).json({
        success: true,
        data: {
          agent: {
            _id: agent._id,
            fullName: agent.fullName,
            email: agent.email,
            role: agent.role,
          },
          settings: agentSettings,
        },
        message: "Agent created with permissions successfully",
      });
    } catch (error) {
      console.error("Create agent with permissions error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while creating agent",
      });
    }
  }

  // Get commission report
  async getCommissionReport(req, res) {
    try {
      const { startDate, endDate, agentId, commissionType } = req.query;

      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);

      const query = {};
      if (Object.keys(dateFilter).length > 0) {
        query.createdAt = dateFilter;
      }
      if (agentId) query.agent = agentId;
      if (commissionType) query.type = commissionType;

      const commissions = await Commission.aggregate([
        {
          $match: query,
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
            _id: {
              agent: "$agent",
              date: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$createdAt",
                },
              },
            },
            agentInfo: { $first: "$agentInfo" },
            totalCommission: { $sum: "$amount" },
            commissionCount: { $sum: 1 },
            types: { $addToSet: "$type" },
          },
        },
        {
          $project: {
            agent: "$_id.agent",
            date: "$_id.date",
            agentInfo: 1,
            totalCommission: 1,
            commissionCount: 1,
            types: 1,
          },
        },
        {
          $sort: { date: -1, totalCommission: -1 },
        },
      ]);

      res.status(200).json({
        success: true,
        data: {
          commissions,
        },
      });
    } catch (error) {
      console.error("Get commission report error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while generating commission report",
      });
    }
  }
}

module.exports = new AdminManagementController();
