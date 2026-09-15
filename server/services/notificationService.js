const Notification = require('../models/Notification');

class NotificationService {
  constructor(socketServer) {
    this.socketServer = socketServer;
  }

  // Create and send notification
  async createNotification(userId, type, title, message, data = {}) {
    try {
      const notification = new Notification({
        user: userId,
        type,
        title,
        message,
        data,
        status: 'unread'
      });

      await notification.save();

      // Send real-time notification
      this.socketServer.sendNotification(userId, {
        _id: notification._id,
        type,
        title,
        message,
        data,
        createdAt: notification.createdAt,
        status: 'unread'
      });

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Send deposit notification
  async sendDepositNotification(userId, amount, status, depositId) {
    const title = 'Deposit Update';
    let message = '';
    
    switch (status) {
      case 'approved':
        message = `Your deposit of ${amount} BDT has been approved and credited to your account.`;
        break;
      case 'rejected':
        message = `Your deposit of ${amount} BDT has been rejected. Please contact support for more information.`;
        break;
      default:
        message = `Your deposit of ${amount} BDT is pending approval.`;
    }

    return await this.createNotification(
      userId,
      'transaction',
      title,
      message,
      { amount, status, depositId, type: 'deposit' }
    );
  }

  // Send withdrawal notification
  async sendWithdrawalNotification(userId, amount, status, withdrawalId) {
    const title = 'Withdrawal Update';
    let message = '';
    
    switch (status) {
      case 'approved':
        message = `Your withdrawal of ${amount} BDT has been approved and will be processed shortly.`;
        break;
      case 'completed':
        message = `Your withdrawal of ${amount} BDT has been completed and funds have been sent.`;
        break;
      case 'rejected':
        message = `Your withdrawal of ${amount} BDT has been rejected. Please contact support for more information.`;
        break;
      default:
        message = `Your withdrawal of ${amount} BDT is pending approval.`;
    }

    return await this.createNotification(
      userId,
      'transaction',
      title,
      message,
      { amount, status, withdrawalId, type: 'withdrawal' }
    );
  }

  // Send bet settlement notification
  async sendBetSettlementNotification(userId, betSlipId, status, winAmount) {
    const title = 'Bet Settled';
    let message = '';
    
    switch (status) {
      case 'won':
        message = `Congratulations! Your bet has won. ${winAmount} BDT has been credited to your account.`;
        break;
      case 'lost':
        message = `Your bet has been settled as lost.`;
        break;
      case 'partially_won':
        message = `Your bet has been partially won. ${winAmount} BDT has been credited to your account.`;
        break;
      default:
        message = `Your bet has been settled.`;
    }

    return await this.createNotification(
      userId,
      'bet',
      title,
      message,
      { betSlipId, status, winAmount }
    );
  }

  // Send bonus notification
  async sendBonusNotification(userId, bonusAmount, promoCode) {
    const title = 'Bonus Received';
    const message = `You have received a bonus of ${bonusAmount} BDT from promo code ${promoCode}.`;

    return await this.createNotification(
      userId,
      'bonus',
      title,
      message,
      { bonusAmount, promoCode }
    );
  }

  // Send security notification
  async sendSecurityNotification(userId, event, ipAddress) {
    const title = 'Security Alert';
    const message = `Security event detected: ${event} from IP ${ipAddress}. If this wasn't you, please contact support immediately.`;

    return await this.createNotification(
      userId,
      'security',
      title,
      message,
      { event, ipAddress, timestamp: new Date() }
    );
  }

  // Get user notifications
  async getUserNotifications(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      status,
      type
    } = options;

    const query = { user: userId };

    if (status) query.status = status;
    if (type) query.type = type;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      user: userId,
      status: 'unread'
    });

    return {
      notifications,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      unreadCount
    };
  }

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { status: 'read', readAt: new Date() },
      { new: true }
    );

    return notification;
  }

  // Mark all notifications as read
  async markAllAsRead(userId) {
    const result = await Notification.updateMany(
      { user: userId, status: 'unread' },
      { status: 'read', readAt: new Date() }
    );

    return result;
  }

  // Delete notification
  async deleteNotification(notificationId, userId) {
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      user: userId
    });

    return notification;
  }

  // Clear all notifications
  async clearAllNotifications(userId) {
    const result = await Notification.deleteMany({ user: userId });
    return result;
  }
}

module.exports = NotificationService;