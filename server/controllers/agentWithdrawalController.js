const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');
const AgentSettings = require('../models/AgentSettings');

class AgentWithdrawalController {
  
  // Approve withdrawal for downline user
  async approveWithdrawal(req, res) {
    try {
      const { withdrawalId } = req.params;
      const { notes } = req.body;

      const agentSettings = await AgentSettings.findOne({ agent: req.user.id });
      
      if (!agentSettings.permissions.approveWithdrawal) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to approve withdrawals'
        });
      }

      const withdrawal = await Withdrawal.findById(withdrawalId)
        .populate('user', 'fullName email phone');

      if (!withdrawal) {
        return res.status(404).json({
          success: false,
          message: 'Withdrawal not found'
        });
      }

      if (withdrawal.provider === 'payment24x7') {
        return res.status(400).json({
          success: false,
          message: 'Payment24x7 withdrawals are finalized by gateway callback'
        });
      }

      // Verify withdrawal belongs to agent's downline
      const isInDownline = await User.findOne({
        _id: withdrawal.user._id,
        $or: [
          { 'hierarchy.masterAgent': req.user.id },
          { 'hierarchy.agent': req.user.id },
          { 'hierarchy.subAgent': req.user.id }
        ]
      });

      if (!isInDownline) {
        return res.status(403).json({
          success: false,
          message: 'This withdrawal does not belong to your downline'
        });
      }

      // Check if withdrawal amount is within agent's approval limit
      if (withdrawal.amount > agentSettings.limits.maxWithdrawal) {
        return res.status(400).json({
          success: false,
          message: `Withdrawal amount exceeds your approval limit of ${agentSettings.limits.maxWithdrawal}`
        });
      }

      // Update withdrawal status
      withdrawal.status = 'approved';
      withdrawal.approvedBy = req.user.id;
      withdrawal.approvedAt = new Date();
      withdrawal.adminNote = notes || `Approved by agent: ${req.user.fullName}`;
      await withdrawal.save();

      // Process the withdrawal (in real scenario, this would interface with payment gateway)
      await this.processWithdrawal(withdrawal);

      res.status(200).json({
        success: true,
        message: 'Withdrawal approved successfully',
        data: withdrawal
      });
    } catch (error) {
      console.error('Approve withdrawal error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while approving withdrawal'
      });
    }
  }

  // Reject withdrawal for downline user
  async rejectWithdrawal(req, res) {
    try {
      const { withdrawalId } = req.params;
      const { rejectionReason, notes } = req.body;

      const agentSettings = await AgentSettings.findOne({ agent: req.user.id });
      
      if (!agentSettings.permissions.approveWithdrawal) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to manage withdrawals'
        });
      }

      const withdrawal = await Withdrawal.findById(withdrawalId)
        .populate('user', 'fullName email phone');

      if (!withdrawal) {
        return res.status(404).json({
          success: false,
          message: 'Withdrawal not found'
        });
      }

      if (withdrawal.provider === 'payment24x7') {
        return res.status(400).json({
          success: false,
          message: 'Payment24x7 withdrawals are finalized by gateway callback'
        });
      }

      // Verify withdrawal belongs to agent's downline
      const isInDownline = await User.findOne({
        _id: withdrawal.user._id,
        $or: [
          { 'hierarchy.masterAgent': req.user.id },
          { 'hierarchy.agent': req.user.id },
          { 'hierarchy.subAgent': req.user.id }
        ]
      });

      if (!isInDownline) {
        return res.status(403).json({
          success: false,
          message: 'This withdrawal does not belong to your downline'
        });
      }

      if (!rejectionReason) {
        return res.status(400).json({
          success: false,
          message: 'Rejection reason is required'
        });
      }

      // Update withdrawal status
      withdrawal.status = 'rejected';
      withdrawal.rejectionReason = rejectionReason;
      withdrawal.adminNote = notes || `Rejected by agent: ${req.user.fullName}`;
      await withdrawal.save();

      // Refund amount to user wallet
      const WalletService = require('../services/walletService');
      await WalletService.updateWallet(
        withdrawal.user._id,
        withdrawal.amount,
        'main',
        'refund',
        {
          description: `Withdrawal rejection refund: ${rejectionReason}`,
          withdrawalId: withdrawal._id
        }
      );

      res.status(200).json({
        success: true,
        message: 'Withdrawal rejected successfully',
        data: withdrawal
      });
    } catch (error) {
      console.error('Reject withdrawal error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while rejecting withdrawal'
      });
    }
  }

  // Process withdrawal (simplified)
  async processWithdrawal(withdrawal) {
    try {
      // In a real implementation, this would:
      // 1. Call payment gateway API
      // 2. Update transaction status
      // 3. Send notification
      
      console.log(`Processing withdrawal ${withdrawal._id} for user ${withdrawal.user.email}`);
      
      // Simulate processing delay
      setTimeout(async () => {
        withdrawal.status = 'completed';
        withdrawal.processedAt = new Date();
        await withdrawal.save();

        // Send notification
        const notificationService = require('../services/notificationService');
        await notificationService.sendWithdrawalNotification(
          withdrawal.user._id,
          withdrawal.amount,
          'completed',
          withdrawal._id
        );
      }, 5000);

    } catch (error) {
      console.error('Process withdrawal error:', error);
      throw error;
    }
  }

  // Get withdrawal statistics for agent's downline
  async getWithdrawalStats(req, res) {
    try {
      const { period = 'today' } = req.query;

      // Get agent's downline user IDs
      const downlineUsers = await User.find({
        $or: [
          { 'hierarchy.masterAgent': req.user.id },
          { 'hierarchy.agent': req.user.id },
          { 'hierarchy.subAgent': req.user.id }
        ]
      }).select('_id');

      const downlineIds = downlineUsers.map(user => user._id);

      const dateFilter = this.getDateFilter(period);

      const stats = await Withdrawal.aggregate([
        {
          $match: {
            user: { $in: downlineIds },
            createdAt: dateFilter
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            averageAmount: { $avg: '$amount' }
          }
        }
      ]);

      const pendingWithdrawals = await Withdrawal.countDocuments({
        user: { $in: downlineIds },
        status: 'pending'
      });

      res.status(200).json({
        success: true,
        data: {
          stats,
          pendingWithdrawals,
          period
        }
      });
    } catch (error) {
      console.error('Get withdrawal stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching withdrawal statistics'
      });
    }
  }

  // Helper for date filter
  getDateFilter(period) {
    const now = new Date();
    let startDate;

    switch (period) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      default:
        startDate = new Date(now.setHours(0, 0, 0, 0));
    }

    return { $gte: startDate };
  }
}

module.exports = new AgentWithdrawalController();
