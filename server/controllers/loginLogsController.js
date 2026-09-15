const LoginLog = require('../models/LoginLog');
const User = require('../models/User');

class LoginLogsController {
  
  // Get login logs for user (admin or agent for their downline)
  async getLoginLogs(req, res) {
    try {
      const { userId, page = 1, limit = 20, status, startDate, endDate } = req.query;

      let query = {};

      // If userId provided, check permissions
      if (userId) {
        // Admin can view any user's logs
        if (req.user.role !== 'admin') {
          // Agents can only view their downline users' logs
          const userInDownline = await User.findOne({
            _id: userId,
            $or: [
              { 'hierarchy.masterAgent': req.user.id },
              { 'hierarchy.agent': req.user.id },
              { 'hierarchy.subAgent': req.user.id }
            ]
          });

          if (!userInDownline) {
            return res.status(403).json({
              success: false,
              message: 'You can only view login logs for your downline users'
            });
          }
        }
        query.user = userId;
      } else {
        // No userId provided - return current user's logs or admin can see all
        if (req.user.role === 'admin') {
          // Admin sees all logs
        } else {
          query.user = req.user.id;
        }
      }

      if (status) query.status = status;
      
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const logs = await LoginLog.find(query)
        .populate('user', 'fullName email phone')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec();

      const total = await LoginLog.countDocuments(query);

      // Get summary statistics
      const summary = await LoginLog.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      res.status(200).json({
        success: true,
        data: {
          logs,
          summary,
          totalPages: Math.ceil(total / limit),
          currentPage: parseInt(page),
          total
        }
      });
    } catch (error) {
      console.error('Get login logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching login logs'
      });
    }
  }

  // Get suspicious login activities
  async getSuspiciousLogins(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;

      // Find multiple failed logins from same IP
      const suspiciousIPs = await LoginLog.aggregate([
        {
          $match: {
            status: 'failed',
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
          }
        },
        {
          $group: {
            _id: '$ipAddress',
            failedAttempts: { $sum: 1 },
            users: { $addToSet: '$user' },
            lastAttempt: { $max: '$createdAt' }
          }
        },
        {
          $match: {
            failedAttempts: { $gt: 5 } // More than 5 failed attempts
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'users',
            foreignField: '_id',
            as: 'userDetails'
          }
        }
      ]);

      const startIndex = (page - 1) * limit;
      const paginatedResults = suspiciousIPs.slice(startIndex, startIndex + limit);

      res.status(200).json({
        success: true,
        data: {
          suspiciousActivities: paginatedResults,
          totalPages: Math.ceil(suspiciousIPs.length / limit),
          currentPage: parseInt(page),
          total: suspiciousIPs.length
        }
      });
    } catch (error) {
      console.error('Get suspicious logins error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching suspicious logins'
      });
    }
  }
}

module.exports = new LoginLogsController();