const AgentSettings = require('../models/AgentSettings');
const User = require('../models/User');

class AgentPermissionController {
  
  // Get default permissions for agent role
  getDefaultPermissions(role) {
    const basePermissions = {
      viewUsers: true,
      viewUserBets: true,
      viewCommission: true,
      viewReports: true,
      earningsWithdrawal: true
    };

    const rolePermissions = {
      master_agent: {
        ...basePermissions,
        addUser: true,
        editUser: true,
        resetUserPassword: true,
        addBalance: true,
        deductBalance: true,
        adjustBalance: true,
        viewTransactions: true,
        createSubAgents: true,
        viewSubAgents: true,
        setSubAgentCommission: true,
        approveDeposit: true,
        approveWithdrawal: true
      },
      agent: {
        ...basePermissions,
        addUser: true,
        resetUserPassword: true,
        addBalance: true,
        deductBalance: true,
        viewTransactions: true,
        createSubAgents: true,
        viewSubAgents: true,
        setSubAgentCommission: false, // Usually only master agents can set commissions
        approveDeposit: false,
        approveWithdrawal: false
      },
      sub_agent: {
        ...basePermissions,
        addUser: true,
        resetUserPassword: false,
        addBalance: false, // Typically sub-agents can't add balance directly
        deductBalance: false,
        viewTransactions: true,
        createSubAgents: false,
        viewSubAgents: false,
        approveDeposit: false,
        approveWithdrawal: false
      }
    };

    return rolePermissions[role] || basePermissions;
  }

  // Get default limits for agent role
  getDefaultLimits(role) {
    const roleLimits = {
      master_agent: {
        maxUsers: 1000,
        maxDeposit: 100000,
        maxWithdrawal: 50000,
        creditLimit: 50000
      },
      agent: {
        maxUsers: 500,
        maxDeposit: 50000,
        maxWithdrawal: 25000,
        creditLimit: 25000
      },
      sub_agent: {
        maxUsers: 100,
        maxDeposit: 10000,
        maxWithdrawal: 5000,
        creditLimit: 10000
      }
    };

    return roleLimits[role] || roleLimits.sub_agent;
  }

  // Create agent with proper permissions and limits
  async createAgentWithPermissions(req, res) {
    try {
      const { fullName, email, phone, password, role, customPermissions, customLimits } = req.body;

      // Validate role
      const validRoles = ['master_agent', 'agent', 'sub_agent'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid agent role'
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email: email.toLowerCase() }, { phone }]
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User already exists with this email or phone'
        });
      }

      // Create user
      const user = new User({
        fullName,
        email: email.toLowerCase(),
        phone,
        password,
        role: role,
        isEmailVerified: true
      });

      await user.save();

      // Get default permissions and limits for the role
      const defaultPermissions = this.getDefaultPermissions(role);
      const defaultLimits = this.getDefaultLimits(role);

      // Merge with custom permissions and limits if provided
      const finalPermissions = { ...defaultPermissions, ...customPermissions };
      const finalLimits = { ...defaultLimits, ...customLimits };

      // Create agent settings
      const agentSettings = new AgentSettings({
        agent: user._id,
        permissions: finalPermissions,
        limits: finalLimits,
        level: this.getAgentLevel(role),
        createdBy: req.user.id
      });

      await agentSettings.save();

      res.status(201).json({
        success: true,
        message: `${role.replace('_', ' ')} created successfully with permissions`,
        data: {
          agent: {
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            role: user.role
          },
          permissions: finalPermissions,
          limits: finalLimits
        }
      });
    } catch (error) {
      console.error('Create agent with permissions error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while creating agent'
      });
    }
  }

  // Get agent level from role
  getAgentLevel(role) {
    const levelMap = {
      'master_agent': 1,
      'agent': 2,
      'sub_agent': 3
    };
    return levelMap[role] || 3;
  }

  // Update agent permissions
  async updateAgentPermissions(req, res) {
    try {
      const { agentId } = req.params;
      const { permissions, limits } = req.body;

      const agentSettings = await AgentSettings.findOne({ agent: agentId })
        .populate('agent', 'fullName email role');

      if (!agentSettings) {
        return res.status(404).json({
          success: false,
          message: 'Agent settings not found'
        });
      }

      // Update permissions and limits
      if (permissions) {
        agentSettings.permissions = { ...agentSettings.permissions, ...permissions };
      }

      if (limits) {
        agentSettings.limits = { ...agentSettings.limits, ...limits };
      }

      await agentSettings.save();

      res.status(200).json({
        success: true,
        message: 'Agent permissions updated successfully',
        data: {
          agent: agentSettings.agent,
          permissions: agentSettings.permissions,
          limits: agentSettings.limits
        }
      });
    } catch (error) {
      console.error('Update agent permissions error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while updating agent permissions'
      });
    }
  }

  // Get permission templates
  async getPermissionTemplates(req, res) {
    try {
      const templates = {
        master_agent: {
          permissions: this.getDefaultPermissions('master_agent'),
          limits: this.getDefaultLimits('master_agent'),
          description: 'Full access to manage agents, sub-agents, and users'
        },
        agent: {
          permissions: this.getDefaultPermissions('agent'),
          limits: this.getDefaultLimits('agent'),
          description: 'Can manage sub-agents and users with some restrictions'
        },
        sub_agent: {
          permissions: this.getDefaultPermissions('sub_agent'),
          limits: this.getDefaultLimits('sub_agent'),
          description: 'Basic access to manage users only'
        }
      };

      res.status(200).json({
        success: true,
        data: templates
      });
    } catch (error) {
      console.error('Get permission templates error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching permission templates'
      });
    }
  }
}

module.exports = new AgentPermissionController();