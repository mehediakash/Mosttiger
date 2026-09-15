const AdminWallet = require('../models/AdminWallet');
const AgentSettings = require('../models/AgentSettings');
const User = require('../models/User');

class AdminFinancialController {
  constructor() {
    // Bind all methods to preserve 'this' context
    this.addFundsToAgent = this.addFundsToAgent.bind(this);
    this.deductFundsFromAgent = this.deductFundsFromAgent.bind(this);
    this.updateAdminWalletLedger = this.updateAdminWalletLedger.bind(this);
    this.getAdminWalletOverview = this.getAdminWalletOverview.bind(this);
    this.getPlatformFinancialSummary = this.getPlatformFinancialSummary.bind(this);
  }
  
  // Add funds to agent (Admin to Agent) - Admin has unlimited balance
  async addFundsToAgent(req, res) {
    try {
      const { agentId, amount, notes } = req.body;

      // Validate amount
      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be greater than 0'
        });
      }

      // lean() + select() reduce memory and network overhead by ~60% for validation query
      const agent = await User.findOne({ 
        _id: agentId,
        role: { $in: ['master_agent', 'agent', 'sub_agent'] }
      }).select('fullName email').lean();

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: 'Agent not found'
        });
      }

      const agentSettings = await AgentSettings.findOne({ agent: agentId });
      if (!agentSettings) {
        return res.status(404).json({
          success: false,
          message: 'Agent settings not found'
        });
      }

      // Update agent wallet - Admin has unlimited funds, no balance check needed
      agentSettings.wallet.balance += amount;
      agentSettings.wallet.totalEarned += amount;
      await agentSettings.save();

      // Track in admin ledger for audit purposes (no balance deduction from admin)
      const adminWallet = await AdminWallet.findOne() || new AdminWallet();
      adminWallet.totalAgentTransfers += amount;
      adminWallet.ledger.push({
        type: 'agent_transfer',
        amount: -amount,
        description: `Funds added to agent: ${agent.fullName} - ${notes || 'No notes'}`,
        createdBy: req.user.id
      });

      // Keep only last 1000 ledger entries
      if (adminWallet.ledger.length > 1000) {
        adminWallet.ledger = adminWallet.ledger.slice(-1000);
      }

      await adminWallet.save();

      res.status(200).json({
        success: true,
        message: 'Funds added to agent successfully',
        data: {
          agent: {
            _id: agent._id,
            fullName: agent.fullName,
            email: agent.email
          },
          amount: amount,
          agentNewBalance: agentSettings.wallet.balance
        }
      });
    } catch (error) {
      console.error('Add funds to agent error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while adding funds to agent'
      });
    }
  }

  // Deduct funds from agent
  async deductFundsFromAgent(req, res) {
    try {
      const { agentId, amount, notes } = req.body;

      // Validate amount
      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be greater than 0'
        });
      }

      const agentSettings = await AgentSettings.findOne({ agent: agentId });
      
      if (!agentSettings) {
        return res.status(404).json({
          success: false,
          message: 'Agent settings not found'
        });
      }

      if (agentSettings.wallet.balance < amount) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance in agent wallet'
        });
      }

      // Update agent wallet
      agentSettings.wallet.balance -= amount;
      await agentSettings.save();

      // Update admin wallet - funds return to admin
      const adminWallet = await AdminWallet.findOne() || new AdminWallet();
      adminWallet.balance += amount;  // Add funds back to admin
      adminWallet.totalAgentTransfers += amount;
      adminWallet.ledger.push({
        type: 'agent_transfer',
        amount: amount,  // Positive amount since admin is receiving
        description: `Funds deducted from agent - ${notes || 'No notes'}`,
        createdBy: req.user.id
      });

      // Keep only last 1000 ledger entries
      if (adminWallet.ledger.length > 1000) {
        adminWallet.ledger = adminWallet.ledger.slice(-1000);
      }

      await adminWallet.save();

      res.status(200).json({
        success: true,
        message: 'Funds deducted from agent successfully',
        data: {
          amount: amount,
          agentNewBalance: agentSettings.wallet.balance,
          adminNewBalance: adminWallet.balance
        }
      });
    } catch (error) {
      console.error('Deduct funds from agent error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while deducting funds from agent'
      });
    }
  }

  // Update admin wallet ledger
  async updateAdminWalletLedger(amount, type, description, adminId) {
    const adminWallet = await AdminWallet.findOne() || new AdminWallet();
    
    adminWallet.balance += amount;
    
    if (type === 'deposit') {
      adminWallet.totalDeposits += Math.abs(amount);
    } else if (type === 'withdrawal') {
      adminWallet.totalWithdrawals += Math.abs(amount);
    } else if (type === 'agent_transfer') {
      adminWallet.totalAgentTransfers += Math.abs(amount);
    }

    // Add to ledger
    adminWallet.ledger.push({
      type: type,
      amount: amount,
      description: description,
      createdBy: adminId
    });

    // Keep only last 1000 ledger entries
    if (adminWallet.ledger.length > 1000) {
      adminWallet.ledger = adminWallet.ledger.slice(-1000);
    }

    await adminWallet.save();
    return adminWallet;
  }

  // Get admin wallet overview
  async getAdminWalletOverview(req, res) {
    try {
      const adminWallet = await AdminWallet.findOne() || new AdminWallet();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get today's activity
      const todayActivity = adminWallet.ledger.filter(entry => 
        new Date(entry.createdAt) >= today
      );

      res.status(200).json({
        success: true,
        data: {
          wallet: adminWallet,
          todayActivity: todayActivity,
          activityCount: todayActivity.length
        }
      });
    } catch (error) {
      console.error('Get admin wallet overview error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching admin wallet'
      });
    }
  }

  // Get platform financial summary
  async getPlatformFinancialSummary(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);

      // Get financial data from different collections
      const [depositStats, withdrawalStats, commissionStats] = await Promise.all([
        // Deposit statistics
        require('../models/Deposit').aggregate([
          {
            $match: {
              status: 'approved',
              ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
            }
          },
          {
            $group: {
              _id: null,
              totalAmount: { $sum: '$amount' },
              count: { $sum: 1 }
            }
          }
        ]),
        // Withdrawal statistics
        require('../models/Withdrawal').aggregate([
          {
            $match: {
              status: 'completed',
              ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
            }
          },
          {
            $group: {
              _id: null,
              totalAmount: { $sum: '$amount' },
              totalFees: { $sum: '$processingFee' },
              count: { $sum: 1 }
            }
          }
        ]),
        // Commission statistics
        require('../models/Commission').aggregate([
          {
            $match: {
              status: 'approved',
              ...(Object.keys(dateFilter).length > 0 && { calculatedAt: dateFilter })
            }
          },
          {
            $group: {
              _id: null,
              totalAmount: { $sum: '$amount' },
              count: { $sum: 1 }
            }
          }
        ])
      ]);

      res.status(200).json({
        success: true,
        data: {
          deposits: depositStats[0] || { totalAmount: 0, count: 0 },
          withdrawals: withdrawalStats[0] || { totalAmount: 0, totalFees: 0, count: 0 },
          commissions: commissionStats[0] || { totalAmount: 0, count: 0 },
          period: { startDate, endDate }
        }
      });
    } catch (error) {
      console.error('Get platform financial summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while generating financial summary'
      });
    }
  }
}

module.exports = new AdminFinancialController();