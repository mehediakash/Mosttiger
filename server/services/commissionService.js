const mongoose = require('mongoose');
const Commission = require('../models/Commission');
const AgentSettings = require('../models/AgentSettings');
const User = require('../models/User');
const GameSession = require('../models/GameSession');
const SportsBet = require('../models/SportsBet');
const WalletService = require('./walletService');

class CommissionService {
  
  // Calculate commission for a game session
  async calculateGameCommission(gameSessionId) {
    const session = await Commission.startSession();
    session.startTransaction();

    try {
      const gameSession = await GameSession.findById(gameSessionId)
        .populate('user')
        .populate('game')
        .session(session);

      if (!gameSession || gameSession.status !== 'completed') {
        throw new Error('Invalid game session');
      }

      const user = gameSession.user;
      const netLoss = Math.max(0, gameSession.betAmount - gameSession.winAmount);

      // Calculate commissions for all levels in the hierarchy
      const commissions = await this.calculateHierarchyCommissions(
        user,
        netLoss,
        gameSession.betAmount,
        'loss_commission',
        {
          gameSession: gameSessionId,
          description: `Game: ${gameSession.game.game_name}`
        }
      );

      await session.commitTransaction();
      session.endSession();

      return {
        success: true,
        commissionsCalculated: commissions.length,
        totalCommission: commissions.reduce((sum, comm) => sum + comm.amount, 0)
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  // Calculate commission for sports bet
  async calculateSportsBetCommission(sportsBetId) {
    const session = await Commission.startSession();
    session.startTransaction();

    try {
      const sportsBet = await SportsBet.findById(sportsBetId)
        .populate('user')
        .session(session);

      if (!sportsBet || sportsBet.status !== 'lost') {
        throw new Error('Invalid sports bet for commission calculation');
      }

      const user = sportsBet.user;
      const netLoss = sportsBet.totalStake;

      // Calculate commissions for all levels in the hierarchy
      const commissions = await this.calculateHierarchyCommissions(
        user,
        netLoss,
        sportsBet.totalStake,
        'loss_commission',
        {
          sportsBet: sportsBetId,
          description: `Sports bet loss`
        }
      );

      await session.commitTransaction();
      session.endSession();

      return {
        success: true,
        commissionsCalculated: commissions.length,
        totalCommission: commissions.reduce((sum, comm) => sum + comm.amount, 0)
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  // Calculate commissions for all hierarchy levels
  async calculateHierarchyCommissions(user, netLoss, turnover, commissionType, metadata = {}) {
    const commissions = [];
    let currentUser = user;
    let level = 1;

    // Traverse up the hierarchy (max 5 levels)
    while (currentUser && level <= 5) {
      const agentId = this.getAgentAtLevel(currentUser, level);
      
      if (!agentId) break;

      const agentSettings = await AgentSettings.findOne({ agent: agentId });
      if (!agentSettings || !agentSettings.isActive) {
        currentUser = await User.findById(agentId);
        level++;
        continue;
      }

      // Get commission rate for this level
      const commissionRate = this.getCommissionRate(agentSettings, commissionType, level);
      
      if (commissionRate > 0) {
        let baseAmount, commissionAmount;

        if (commissionType === 'loss_commission') {
          baseAmount = netLoss;
          commissionAmount = (baseAmount * commissionRate) / 100;
        } else if (commissionType === 'turnover_commission') {
          baseAmount = turnover;
          commissionAmount = (baseAmount * commissionRate) / 100;
        }

        if (commissionAmount > 0) {
          const commission = new Commission({
            agent: agentId,
            fromUser: user._id,
            type: commissionType,
            level: level,
            amount: commissionAmount,
            percentage: commissionRate,
            baseAmount: baseAmount,
            status: 'approved',
            ...metadata
          });

          await commission.save();
          commissions.push(commission);

          // Update agent's pending commission
          agentSettings.wallet.pendingCommission += commissionAmount;
          agentSettings.wallet.totalEarned += commissionAmount;
          await agentSettings.save();
        }
      }

      currentUser = await User.findById(agentId);
      level++;
    }

    return commissions;
  }

  // Get agent at specific level in hierarchy
  getAgentAtLevel(user, targetLevel) {
    let level = 1;
    let currentUser = user;

    while (currentUser && level < targetLevel) {
      if (currentUser.hierarchy.subAgent) {
        currentUser = currentUser.hierarchy.subAgent;
      } else if (currentUser.hierarchy.agent) {
        currentUser = currentUser.hierarchy.agent;
      } else if (currentUser.hierarchy.masterAgent) {
        currentUser = currentUser.hierarchy.masterAgent;
      } else {
        return null;
      }
      level++;
    }

    return currentUser ? currentUser._id : null;
  }

  // Get commission rate for agent and level
  getCommissionRate(agentSettings, commissionType, level) {
    if (level === 1) {
      return agentSettings.commissionRates[commissionType] || 0;
    } else {
      const levelKey = `level${level - 1}`;
      return agentSettings.downlineCommissionRates[levelKey]?.[commissionType] || 0;
    }
  }

  // Get agent commission summary
  async getAgentCommissionSummary(agentId, period = 'month') {
    const dateFilter = this.getDateFilter(period);
    
    const commissionStats = await Commission.aggregate([
      {
        $match: {
          agent: agentId,
          status: 'approved',
          calculatedAt: dateFilter
        }
      },
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const totalCommission = await Commission.aggregate([
      {
        $match: {
          agent: agentId,
          status: 'approved',
          calculatedAt: dateFilter
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const downlineStats = await this.getDownlineStats(agentId, period);
    
    // Get agent wallet data
    const agentSettings = await AgentSettings.findOne({ agent: agentId });

    return {
      availableCommission: agentSettings?.wallet?.balance || 0,
      pendingWithdrawal: agentSettings?.wallet?.pendingCommission || 0,
      totalEarned: agentSettings?.wallet?.totalEarned || 0,
      totalCommission: totalCommission[0]?.total || 0,
      byType: commissionStats,
      downline: downlineStats,
      period: period
    };
  }

  // Get downline statistics
  async getDownlineStats(agentId, period) {
    const dateFilter = this.getDateFilter(period);
    
    const downlineUsers = await User.find({
      $or: [
        { 'hierarchy.masterAgent': agentId },
        { 'hierarchy.agent': agentId },
        { 'hierarchy.subAgent': agentId }
      ]
    });

    const downlineStats = {
      totalUsers: downlineUsers.length,
      activeUsers: 0,
      totalTurnover: 0,
      totalCommission: 0
    };

    // Calculate detailed stats for downline
    for (const user of downlineUsers) {
      const userTurnover = await this.getUserTurnover(user._id, dateFilter);
      downlineStats.totalTurnover += userTurnover;

      // Get commissions from this user
      const userCommissions = await Commission.aggregate([
        {
          $match: {
            agent: agentId,
            fromUser: user._id,
            status: 'approved',
            calculatedAt: dateFilter
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      downlineStats.totalCommission += userCommissions[0]?.total || 0;
    }

    return downlineStats;
  }

  // Get user turnover for period
  async getUserTurnover(userId, dateFilter) {
    const gameTurnover = await GameSession.aggregate([
      {
        $match: {
          user: userId,
          status: 'completed',
          createdAt: dateFilter
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$betAmount' }
        }
      }
    ]);

    const sportsTurnover = await SportsBet.aggregate([
      {
        $match: {
          user: userId,
          status: { $in: ['won', 'lost', 'partially_won'] },
          placedAt: dateFilter
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalStake' }
        }
      }
    ]);

    return (gameTurnover[0]?.total || 0) + (sportsTurnover[0]?.total || 0);
  }

  // Get date filter for period
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
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(now.setMonth(now.getMonth() - 1));
    }

    return { $gte: startDate };
  }

  // Withdraw commission to main wallet
  async withdrawCommission(agentId, amount) {
    const session = await Commission.startSession();
    session.startTransaction();

    try {
      let agentSettings = await AgentSettings.findOne({ agent: agentId }).session(session);
      
      // Auto-create AgentSettings if they don't exist
      if (!agentSettings) {
        console.log(`Creating AgentSettings for agent: ${agentId}`);
        agentSettings = new AgentSettings({
          agent: agentId,
          wallet: {
            balance: 0,
            pendingCommission: 0,
            totalEarned: 0
          }
        });
        await agentSettings.save({ session });
      }

      if (agentSettings.wallet.pendingCommission < amount) {
        throw new Error('Insufficient commission balance');
      }

      // Update agent wallet
      agentSettings.wallet.pendingCommission -= amount;
      agentSettings.wallet.balance += amount;
      await agentSettings.save({ session });

      // Create commission withdrawal record
      const CommissionWithdrawal = require('../models/CommissionWithdrawal');
      const withdrawal = new CommissionWithdrawal({
        agent: agentId,
        amount: amount,
        previousBalance: agentSettings.wallet.pendingCommission + amount,
        newBalance: agentSettings.wallet.pendingCommission,
        status: 'completed'
      });

      await withdrawal.save({ session });

      // Transfer to main wallet
      await WalletService.updateWallet(
        agentId,
        amount,
        'main',
        'commission',
        {
          description: 'Commission withdrawal',
          referenceId: withdrawal._id
        }
      );

      await session.commitTransaction();
      session.endSession();

      return {
        success: true,
        amount: amount,
        newCommissionBalance: agentSettings.wallet.pendingCommission,
        newWalletBalance: agentSettings.wallet.balance
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  // Get commission withdrawal history
  async getCommissionWithdrawalHistory(agentId, params = {}) {
    const { page = 1, limit = 20, status } = params;

    const query = { agent: agentId };
    if (status) query.status = status;

    const withdrawals = await mongoose.model('CommissionWithdrawal').find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await mongoose.model('CommissionWithdrawal').countDocuments(query);

    return {
      withdrawals,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    };
  }
}

module.exports = new CommissionService();