const User = require('../models/User');
const Deposit = require('../models/Deposit');
const Withdrawal = require('../models/Withdrawal');

class FraudDetectionController {
  
  // Get fraud alerts and suspicious activities
  async getFraudAlerts(req, res) {
    try {
      const { page = 1, limit = 20, severity } = req.query;

      // Detect suspicious activities (simplified implementation)
      const alerts = await this.detectSuspiciousActivities(severity);

      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedAlerts = alerts.slice(startIndex, endIndex);

      res.status(200).json({
        success: true,
        data: {
          alerts: paginatedAlerts,
          totalPages: Math.ceil(alerts.length / limit),
          currentPage: parseInt(page),
          total: alerts.length,
          summary: {
            high: alerts.filter(a => a.severity === 'high').length,
            medium: alerts.filter(a => a.severity === 'medium').length,
            low: alerts.filter(a => a.severity === 'low').length
          }
        }
      });
    } catch (error) {
      console.error('Get fraud alerts error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching fraud alerts'
      });
    }
  }

  // Detect suspicious activities
  async detectSuspiciousActivities(severityFilter = null) {
    const alerts = [];

    // 1. Multiple accounts with same IP
    const ipAlerts = await this.detectMultipleAccountsSameIP();
    alerts.push(...ipAlerts);

    // 2. Rapid deposit-withdrawal patterns
    const rapidAlerts = await this.detectRapidTransactions();
    alerts.push(...rapidAlerts);

    // 3. Unusual withdrawal patterns
    const withdrawalAlerts = await this.detectUnusualWithdrawals();
    alerts.push(...withdrawalAlerts);

    // Filter by severity if specified
    if (severityFilter) {
      return alerts.filter(alert => alert.severity === severityFilter);
    }

    return alerts.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  // Detect multiple accounts from same IP
  async detectMultipleAccountsSameIP() {
    const alerts = [];
    
    // This would typically check login IPs - simplified for example
    const users = await User.aggregate([
      {
        $match: {
          lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        }
      },
      {
        $group: {
          _id: '$lastLoginIP',
          users: { $push: { _id: '$_id', email: '$email', fullName: '$fullName' } },
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gt: 3 } // More than 3 accounts from same IP
        }
      }
    ]);

    users.forEach(ipGroup => {
      alerts.push({
        type: 'multiple_accounts_same_ip',
        severity: ipGroup.count > 5 ? 'high' : 'medium',
        title: 'Multiple Accounts from Same IP',
        message: `${ipGroup.count} accounts accessed from same IP address`,
        data: {
          ip: ipGroup._id,
          users: ipGroup.users,
          count: ipGroup.count
        },
        detectedAt: new Date()
      });
    });

    return alerts;
  }

  // Detect rapid deposit-withdrawal patterns
  async detectRapidTransactions() {
    const alerts = [];
    
    const rapidUsers = await Deposit.aggregate([
      {
        $match: {
          status: 'approved',
          createdAt: { $gte: new Date(Date.now() - 1 * 60 * 60 * 1000) } // Last 1 hour
        }
      },
      {
        $group: {
          _id: '$user',
          depositCount: { $sum: 1 },
          totalDeposited: { $sum: '$amount' },
          lastDeposit: { $max: '$createdAt' }
        }
      },
      {
        $match: {
          depositCount: { $gt: 5 } // More than 5 deposits in 1 hour
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      }
    ]);

    rapidUsers.forEach(user => {
      alerts.push({
        type: 'rapid_deposits',
        severity: 'medium',
        title: 'Rapid Deposit Pattern Detected',
        message: `User made ${user.depositCount} deposits in 1 hour`,
        data: {
          userId: user._id,
          user: user.userInfo[0],
          depositCount: user.depositCount,
          totalDeposited: user.totalDeposited
        },
        detectedAt: new Date()
      });
    });

    return alerts;
  }

  // Detect unusual withdrawal patterns
  async detectUnusualWithdrawals() {
    const alerts = [];
    
    const unusualWithdrawals = await Withdrawal.aggregate([
      {
        $match: {
          status: 'pending',
          amount: { $gt: 10000 } // Large withdrawal amounts
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $unwind: '$userInfo'
      },
      {
        $match: {
          'userInfo.createdAt': { 
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Account created in last 7 days
          }
        }
      }
    ]);

    unusualWithdrawals.forEach(withdrawal => {
      alerts.push({
        type: 'unusual_withdrawal_new_account',
        severity: 'high',
        title: 'Large Withdrawal from New Account',
        message: `New user requested large withdrawal of ${withdrawal.amount}`,
        data: {
          withdrawalId: withdrawal._id,
          user: withdrawal.userInfo,
          amount: withdrawal.amount,
          accountAge: Math.floor((Date.now() - withdrawal.userInfo.createdAt) / (24 * 60 * 60 * 1000))
        },
        detectedAt: new Date()
      });
    });

    return alerts;
  }

  // Mark alert as resolved
  async resolveAlert(req, res) {
    try {
      const { alertId } = req.params;
      const { resolutionNotes } = req.body;

      // In a real implementation, you'd store this in a fraud_alerts collection
      // For now, we'll just log the resolution
      console.log(`Alert ${alertId} resolved by ${req.user.id}. Notes: ${resolutionNotes}`);

      res.status(200).json({
        success: true,
        message: 'Alert marked as resolved',
        data: {
          alertId,
          resolvedBy: req.user.id,
          resolvedAt: new Date(),
          resolutionNotes
        }
      });
    } catch (error) {
      console.error('Resolve alert error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while resolving alert'
      });
    }
  }
}

module.exports = new FraudDetectionController();