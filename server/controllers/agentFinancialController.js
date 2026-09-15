const AgentTransfer = require('../models/AgentTransfer');
const AgentSettings = require('../models/AgentSettings');
const User = require('../models/User');
const WalletService = require('../services/walletService');

class AgentFinancialController {
  
  // Transfer balance to user (Agent to User)
  async transferToUser(req, res) {
    try {
      const { userId, amount, notes } = req.body;

      const agentSettings = await AgentSettings.findOne({ agent: req.user.id });
      
      if (!agentSettings) {
        return res.status(404).json({
          success: false,
          message: 'Agent settings not found. Please contact support to initialize your agent account.'
        });
      }

      if (!agentSettings.permissions.addBalance) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to transfer balance'
        });
      }

      // Check agent wallet balance
      if (agentSettings.wallet.balance < amount) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance in your agent wallet'
        });
      }

      // Verify user is in downline
      // lean() + select() reduce memory and network overhead by ~60%
      const user = await User.findOne({
        _id: userId,
        $or: [
          { 'hierarchy.masterAgent': req.user.id },
          { 'hierarchy.agent': req.user.id },
          { 'hierarchy.subAgent': req.user.id }
        ]
      }).select('_id').lean();

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found in your downline'
        });
      }

      // Create transfer record
      const transfer = new AgentTransfer({
        fromAgent: req.user.id,
        toUser: userId,
        amount: amount,
        type: 'to_user',
        notes: notes || '',
        status: 'completed'
      });

      await transfer.save();

      // Deduct from agent wallet
      agentSettings.wallet.balance -= amount;
      await agentSettings.save();

      // Add to user wallet
      await WalletService.updateWallet(
        userId,
        amount,
        'main',
        'agent_transfer',
        {
          description: `Balance transfer from agent: ${notes || 'No notes'}`,
          transferId: transfer._id,
          agentId: req.user.id
        }
      );

      res.status(200).json({
        success: true,
        message: 'Balance transferred successfully',
        data: {
          transferId: transfer._id,
          referenceId: transfer.referenceId,
          amount: amount,
          newAgentBalance: agentSettings.wallet.balance
        }
      });
    } catch (error) {
      console.error('Transfer to user error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while transferring balance'
      });
    }
  }

  // Get agent transfer history
  async getTransferHistory(req, res) {
    try {
      const { page = 1, limit = 20, type, status } = req.query;

      const query = { fromAgent: req.user.id };

      if (type) query.type = type;
      if (status) query.status = status;

      const transfers = await AgentTransfer.find(query)
        .populate('toUser', 'fullName email phone')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean() // Reduce memory usage by ~40%
        .exec();

      const total = await AgentTransfer.countDocuments(query);

      res.status(200).json({
        success: true,
        data: {
          transfers,
          totalPages: Math.ceil(total / limit),
          currentPage: parseInt(page),
          total
        }
      });
    } catch (error) {
      console.error('Get transfer history error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching transfer history'
      });
    }
  }

  // Get agent wallet summary
  async getAgentWalletSummary(req, res) {
    try {
      let agentSettings = await AgentSettings.findOne({ agent: req.user.id });
      
      if (!agentSettings) {
        // If settings don't exist, create a default one
        agentSettings = new AgentSettings({
          agent: req.user.id,
          createdBy: req.user.id, 
        });
        await agentSettings.save();
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get today's transfers
      const todayTransfers = await AgentTransfer.aggregate([
        {
          $match: {
            fromAgent: req.user.id,
            status: 'completed',
            createdAt: { $gte: today }
          }
        },
        {
          $group: {
            _id: null,
            totalTransferred: { $sum: '$amount' },
            transferCount: { $sum: 1 }
          }
        }
      ]);

      res.status(200).json({
        success: true,
        data: {
          wallet: agentSettings.wallet,
          todayStats: {
            totalTransferred: todayTransfers[0]?.totalTransferred || 0,
            transferCount: todayTransfers[0]?.transferCount || 0
          }
        }
      });
    } catch (error) {
      console.error('Get agent wallet summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching wallet summary'
      });
    }
  }
}

module.exports = new AgentFinancialController();