const Commission = require('../models/Commission');
const AgentSettings = require('../models/AgentSettings');
const User = require('../models/User');

class CommissionSplitService {
  
  // Calculate multi-level commission split
  async calculateMultiLevelCommission(gameSessionId) {
    try {
      const GameSession = require('../models/GameSession');
      const gameSession = await GameSession.findById(gameSessionId)
        .populate('user')
        .populate('game');

      if (!gameSession || gameSession.status !== 'completed') {
        throw new Error('Invalid game session for commission calculation');
      }

      const user = gameSession.user;
      const netLoss = Math.max(0, gameSession.betAmount - gameSession.winAmount);

      if (netLoss <= 0) return { success: true, commissions: [] };

      // Get hierarchy chain for the user
      const hierarchyChain = await this.getUserHierarchyChain(user._id);
      
      const commissions = [];
      let remainingAmount = netLoss;

      // Calculate commissions for each level in hierarchy
      for (const levelData of hierarchyChain) {
        if (!levelData.agent || !levelData.settings) continue;

        const commissionRate = levelData.settings.commissionRates.loss_commission || 0;
        const commissionAmount = (remainingAmount * commissionRate) / 100;

        if (commissionAmount > 0) {
          const commission = new Commission({
            agent: levelData.agent._id,
            fromUser: user._id,
            type: 'loss_commission',
            level: levelData.level,
            amount: commissionAmount,
            percentage: commissionRate,
            baseAmount: netLoss,
            gameSession: gameSessionId,
            status: 'approved'
          });

          await commission.save();
          commissions.push(commission);

          // Update agent's pending commission
          levelData.settings.wallet.pendingCommission += commissionAmount;
          levelData.settings.wallet.totalEarned += commissionAmount;
          await levelData.settings.save();

          // Reduce amount for next level (if any)
          remainingAmount -= commissionAmount;
        }
      }

      return {
        success: true,
        commissions: commissions,
        totalCommission: commissions.reduce((sum, comm) => sum + comm.amount, 0)
      };
    } catch (error) {
      console.error('Multi-level commission calculation error:', error);
      throw error;
    }
  }

  // Get user's complete hierarchy chain
  async getUserHierarchyChain(userId) {
    const hierarchyChain = [];
    let currentUser = await User.findById(userId);
    
    if (!currentUser) return hierarchyChain;

    // Traverse up the hierarchy (max 3 levels: sub-agent → agent → master agent)
    let level = 1;
    while (currentUser && level <= 3) {
      let agentId = null;
      
      if (level === 1 && currentUser.hierarchy?.subAgent) {
        agentId = currentUser.hierarchy.subAgent;
      } else if (level === 2 && currentUser.hierarchy?.agent) {
        agentId = currentUser.hierarchy.agent;
      } else if (level === 3 && currentUser.hierarchy?.masterAgent) {
        agentId = currentUser.hierarchy.masterAgent;
      }

      if (agentId) {
        const agent = await User.findById(agentId);
        const agentSettings = await AgentSettings.findOne({ agent: agentId });
        
        if (agent && agentSettings) {
          hierarchyChain.push({
            level: level,
            agent: agent,
            settings: agentSettings
          });
        }
        
        currentUser = agent;
      } else {
        break;
      }
      
      level++;
    }

    return hierarchyChain;
  }

  // Update agent commission rates (Admin function)
  async updateAgentCommissionRates(agentId, newRates) {
    try {
      const agentSettings = await AgentSettings.findOne({ agent: agentId });
      
      if (!agentSettings) {
        throw new Error('Agent settings not found');
      }

      // Update commission rates
      agentSettings.commissionRates = {
        ...agentSettings.commissionRates,
        ...newRates
      };

      await agentSettings.save();

      return {
        success: true,
        agentSettings: agentSettings
      };
    } catch (error) {
      console.error('Update agent commission rates error:', error);
      throw error;
    }
  }
}

module.exports = new CommissionSplitService();