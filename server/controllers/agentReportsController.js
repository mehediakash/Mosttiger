const User = require('../models/User');
const GameSession = require('../models/GameSession');
const SportsBet = require('../models/SportsBet');
const Commission = require('../models/Commission');

class AgentReportsController {
  
  // Get detailed agent report
  async getAgentDetailedReport(req, res) {
    try {
      const { startDate, endDate, reportType = 'daily' } = req.query;

      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);

      // OPTIMIZATION: Get agent's downline user IDs once and reuse
      // lean() reduces memory usage by ~40% per document
      const downlineUsers = await User.find({
        $or: [
          { 'hierarchy.masterAgent': req.user.id },
          { 'hierarchy.agent': req.user.id },
          { 'hierarchy.subAgent': req.user.id }
        ]
      }).select('_id').lean();

      const downlineIds = downlineUsers.map(user => user._id);

      const [
        userStats,
        gameStats,
        sportsStats,
        commissionStats,
        financialStats
      ] = await Promise.all([
        this.getUserStatistics(downlineIds, dateFilter),
        this.getGameStatistics(downlineIds, dateFilter, reportType),
        this.getSportsStatistics(downlineIds, dateFilter, reportType),
        this.getCommissionStatistics(req.user.id, dateFilter, reportType),
        this.getFinancialStatistics(downlineIds, dateFilter)
      ]);

      res.status(200).json({
        success: true,
        data: {
          period: { startDate, endDate, reportType },
          userStats,
          gameStats,
          sportsStats,
          commissionStats,
          financialStats,
          summary: {
            totalUsers: userStats.totalUsers,
            activeUsers: userStats.activeUsers,
            totalTurnover: (gameStats.totalBets || 0) + (sportsStats.totalStake || 0),
            totalCommission: commissionStats.totalCommission || 0,
            netRevenue: financialStats.netRevenue || 0
          }
        }
      });
    } catch (error) {
      console.error('Get agent detailed report error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while generating agent report'
      });
    }
  }

  // Get user statistics for report
  async getUserStatistics(userIds, dateFilter) {
    // OPTIMIZATION: Use userIds.length instead of counting again
    const totalUsers = userIds.length;
    
    const activeUsers = await User.countDocuments({
      _id: { $in: userIds },
      lastLogin: dateFilter
    });

    const newUsers = await User.countDocuments({
      _id: { $in: userIds },
      createdAt: dateFilter
    });

    return {
      totalUsers,
      activeUsers,
      newUsers,
      inactiveUsers: totalUsers - activeUsers
    };
  }

  // Get game statistics for report
  async getGameStatistics(userIds, dateFilter, reportType) {
    const matchStage = {
      user: { $in: userIds },
      status: 'completed'
    };

    if (Object.keys(dateFilter).length > 0) {
      matchStage.createdAt = dateFilter;
    }

    const groupBy = this.getGroupByExpression(reportType, 'createdAt');

    return await GameSession.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: groupBy,
          totalBets: { $sum: '$betAmount' },
          totalWins: { $sum: '$winAmount' },
          sessionCount: { $sum: 1 },
          uniquePlayers: { $addToSet: '$user' }
        }
      },
      {
        $project: {
          date: '$_id',
          totalBets: 1,
          totalWins: 1,
          netRevenue: { $subtract: ['$totalBets', '$totalWins'] },
          sessionCount: 1,
          uniquePlayerCount: { $size: '$uniquePlayers' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
  }

  // Get sports statistics for report
  async getSportsStatistics(userIds, dateFilter, reportType) {
    const matchStage = {
      user: { $in: userIds }
    };

    if (Object.keys(dateFilter).length > 0) {
      matchStage.placedAt = dateFilter;
    }

    const groupBy = this.getGroupByExpression(reportType, 'placedAt');

    return await SportsBet.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: groupBy,
          totalStake: { $sum: '$totalStake' },
          totalWins: { $sum: '$actualWin' },
          betCount: { $sum: 1 },
          uniquePlayers: { $addToSet: '$user' }
        }
      },
      {
        $project: {
          date: '$_id',
          totalStake: 1,
          totalWins: 1,
          netRevenue: { $subtract: ['$totalStake', '$totalWins'] },
          betCount: 1,
          uniquePlayerCount: { $size: '$uniquePlayers' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
  }

  // Get commission statistics for report
  async getCommissionStatistics(agentId, dateFilter, reportType) {
    const matchStage = {
      agent: agentId,
      status: 'approved'
    };

    if (Object.keys(dateFilter).length > 0) {
      matchStage.calculatedAt = dateFilter;
    }

    const groupBy = this.getGroupByExpression(reportType, 'calculatedAt');

    return await Commission.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: groupBy,
          totalCommission: { $sum: '$amount' },
          commissionCount: { $sum: 1 },
          byType: {
            $push: {
              type: '$type',
              amount: '$amount'
            }
          }
        }
      },
      {
        $project: {
          date: '$_id',
          totalCommission: 1,
          commissionCount: 1,
          byType: 1
        }
      },
      { $sort: { _id: 1 } }
    ]);
  }

  // Get financial statistics
  async getFinancialStatistics(userIds, dateFilter) {
    const [deposits, withdrawals] = await Promise.all([
      require('../models/Deposit').aggregate([
        {
          $match: {
            user: { $in: userIds },
            status: 'approved',
            ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
          }
        },
        {
          $group: {
            _id: null,
            totalDeposits: { $sum: '$amount' },
            depositCount: { $sum: 1 }
          }
        }
      ]),
      require('../models/Withdrawal').aggregate([
        {
          $match: {
            user: { $in: userIds },
            status: 'completed',
            ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
          }
        },
        {
          $group: {
            _id: null,
            totalWithdrawals: { $sum: '$amount' },
            withdrawalCount: { $sum: 1 }
          }
        }
      ])
    ]);

    return {
      totalDeposits: deposits[0]?.totalDeposits || 0,
      depositCount: deposits[0]?.depositCount || 0,
      totalWithdrawals: withdrawals[0]?.totalWithdrawals || 0,
      withdrawalCount: withdrawals[0]?.withdrawalCount || 0,
      netCashFlow: (deposits[0]?.totalDeposits || 0) - (withdrawals[0]?.totalWithdrawals || 0)
    };
  }

  // Helper for group by expression
  getGroupByExpression(reportType, dateField) {
    const format = reportType === 'daily' ? '%Y-%m-%d' : 
                  reportType === 'weekly' ? '%Y-%U' : '%Y-%m';
    
    return {
      $dateToString: {
        format: format,
        date: `$${dateField}`
      }
    };
  }
}

module.exports = new AgentReportsController();