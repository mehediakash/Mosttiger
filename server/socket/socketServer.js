const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const conversationService = require('../services/conversationService');
const messageService = require('../services/messageService');

class SocketServer {
  constructor(server) {
    this.io = socketIO(server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });
    
    this.connectedUsers = new Map();
    this.userSockets = new Map();
    this.userPresence = new Map();
    this.userLastSeen = new Map();
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  // Setup JWT authentication middleware
  setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user || !user.isActive || user.isBlocked) {
          return next(new Error('Authentication error: User not found or inactive'));
        }

        socket.userId = user._id;
        socket.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  // Setup event handlers
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User ${socket.userId} connected`);
      
      // Add user to connected users map
      this.connectedUsers.set(socket.userId, socket.id);
      this.addUserSocket(socket.userId, socket.id);
      this.setUserOnline(socket.userId, socket.user.role);

      // Join user to their personal room
      socket.join(`user_${socket.userId}`);
      
      // Join user to appropriate rooms based on role
      if (socket.user.role !== 'user') {
        socket.join(`agents_${socket.user.role}`);
      }

      // Handle live score subscriptions
      this.handleLiveScores(socket);

      // Handle notification subscriptions
      this.handleNotifications(socket);

      // Handle live chat conversation rooms
      this.handleChatConversations(socket);

      // Handle live chat messages
      this.handleChatMessages(socket);

      // Handle advanced live chat events
      this.handleChatAdvancedEvents(socket);

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`User ${socket.userId} disconnected`);
        this.connectedUsers.delete(socket.userId);
        this.removeUserSocket(socket.userId, socket.id, socket.user.role);
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`Socket error for user ${socket.userId}:`, error);
      });
    });
  }

  // Handle live score subscriptions
  handleLiveScores(socket) {
    socket.on('subscribe_live_scores', (sports) => {
      if (Array.isArray(sports)) {
        sports.forEach(sport => {
          socket.join(`live_scores_${sport}`);
          console.log(`User ${socket.userId} subscribed to ${sport} live scores`);
        });
      }
    });

    socket.on('unsubscribe_live_scores', (sports) => {
      if (Array.isArray(sports)) {
        sports.forEach(sport => {
          socket.leave(`live_scores_${sport}`);
          console.log(`User ${socket.userId} unsubscribed from ${sport} live scores`);
        });
      }
    });
  }

  // Handle notification subscriptions
  handleNotifications(socket) {
    socket.on('subscribe_notifications', () => {
      socket.join(`notifications_${socket.userId}`);
    });

    socket.on('unsubscribe_notifications', () => {
      socket.leave(`notifications_${socket.userId}`);
    });
  }

  // Handle live chat conversation room subscriptions
  handleChatConversations(socket) {
    socket.on('join_conversation', async (payload, callback) => {
      try {
        const conversationId =
          typeof payload === 'string' ? payload : payload?.conversationId;

        const canAccess = await conversationService.canAccessConversation(
          conversationId,
          socket.user,
        );

        if (!canAccess) {
          const response = {
            success: false,
            message: 'Conversation not found or access denied',
          };

          if (typeof callback === 'function') return callback(response);
          return socket.emit('conversation_error', response);
        }

        socket.join(`conversation_${conversationId}`);
        const conversation = await messageService.markConversationRead(
          conversationId,
          socket.user,
        );
        this.emitConversationUpdate(conversationId, { conversation });
        this.io.to(`conversation_${conversationId}`).emit('message_seen', {
          conversationId,
          userId: socket.userId,
          seenAt: new Date(),
        });
        this.io.to(`conversation_${conversationId}`).emit('presence_update', {
          userId: socket.userId,
          role: socket.user.role,
          online: true,
          lastSeen: null,
        });

        const response = {
          success: true,
          conversationId,
          conversation,
        };

        if (typeof callback === 'function') return callback(response);
        socket.emit('conversation_joined', response);
      } catch (error) {
        const response = {
          success: false,
          message: 'Unable to join conversation',
        };

        if (typeof callback === 'function') return callback(response);
        socket.emit('conversation_error', response);
      }
    });

    socket.on('leave_conversation', (payload, callback) => {
      const conversationId =
        typeof payload === 'string' ? payload : payload?.conversationId;

      if (conversationId) {
        socket.leave(`conversation_${conversationId}`);
      }

      const response = {
        success: true,
        conversationId,
      };

      if (typeof callback === 'function') return callback(response);
      socket.emit('conversation_left', response);
    });
  }

  // Handle real-time live chat messages
  handleChatMessages(socket) {
    socket.on('send_message', async (payload = {}, callback) => {
      try {
        const result = await messageService.createMessage({
          conversationId: payload.conversationId,
          user: socket.user,
          messageType: payload.messageType || 'text',
          message: payload.message,
          clientMessageId: payload.clientMessageId,
        });

        if (!result.duplicate) {
          let target = socket.to(`conversation_${payload.conversationId}`);
          if (result.message.senderType === 'user') {
            target = target.to('agents_admin');
          }

          target.emit('receive_message', {
            message: result.message,
            conversation: result.conversation,
          });
          target.emit('message_received', {
            message: result.message,
            conversationId: payload.conversationId,
          });
          this.emitConversationUpdate(payload.conversationId, {
            conversation: result.conversation,
          });
          this.io.to(`conversation_${payload.conversationId}`).emit('notification', {
            type: 'new_message',
            conversationId: payload.conversationId,
            message: result.message,
          });
        }

        const response = {
          success: true,
          duplicate: result.duplicate,
          message: result.message,
          conversation: result.conversation,
        };

        socket.emit('message_sent', response);
        if (typeof callback === 'function') return callback(response);
      } catch (error) {
        const response = {
          success: false,
          message: error.message || 'Unable to send message',
        };

        if (typeof callback === 'function') return callback(response);
        socket.emit('conversation_error', response);
      }
    });
  }

  // Handle typing, status, and presence events for live chat
  handleChatAdvancedEvents(socket) {
    socket.on('typing_start', async (payload = {}) => {
      await this.forwardConversationEvent(socket, payload.conversationId, 'typing_start', {
        conversationId: payload.conversationId,
        userId: socket.userId,
        role: socket.user.role,
      });
    });

    socket.on('typing_stop', async (payload = {}) => {
      await this.forwardConversationEvent(socket, payload.conversationId, 'typing_stop', {
        conversationId: payload.conversationId,
        userId: socket.userId,
        role: socket.user.role,
      });
    });

    socket.on('message_delivered', async (payload = {}, callback) => {
      try {
        const result = await messageService.markMessagesDelivered(
          payload.conversationId,
          socket.user,
        );

        this.io.to(`conversation_${payload.conversationId}`).emit('message_delivered', {
          conversationId: payload.conversationId,
          userId: socket.userId,
          deliveredAt: new Date(),
          messages: result.messages,
        });

        const response = { success: true, ...result };
        if (typeof callback === 'function') return callback(response);
      } catch (error) {
        const response = { success: false, message: error.message || 'Unable to mark delivered' };
        if (typeof callback === 'function') return callback(response);
        socket.emit('conversation_error', response);
      }
    });

    socket.on('message_seen', async (payload = {}, callback) => {
      try {
        const result = await messageService.markMessagesSeen(
          payload.conversationId,
          socket.user,
        );

        this.io.to(`conversation_${payload.conversationId}`).emit('message_seen', {
          conversationId: payload.conversationId,
          userId: socket.userId,
          seenAt: new Date(),
          messages: result.messages,
          conversation: result.conversation,
        });
        this.emitConversationUpdate(payload.conversationId, {
          conversation: result.conversation,
        });

        const response = { success: true, ...result };
        if (typeof callback === 'function') return callback(response);
      } catch (error) {
        const response = { success: false, message: error.message || 'Unable to mark seen' };
        if (typeof callback === 'function') return callback(response);
        socket.emit('conversation_error', response);
      }
    });

    socket.on('presence_request', async (payload = {}, callback) => {
      const conversationId = payload.conversationId;
      const canAccess = await conversationService.canAccessConversation(
        conversationId,
        socket.user,
      );

      if (!canAccess) {
        const response = { success: false, message: 'Conversation not found or access denied' };
        if (typeof callback === 'function') return callback(response);
        return;
      }

      const response = {
        success: true,
        presence: this.getPresenceSnapshot(socket.user.role),
      };

      if (typeof callback === 'function') return callback(response);
      socket.emit('presence_update', response);
    });
  }

  async forwardConversationEvent(socket, conversationId, event, payload) {
    const canAccess = await conversationService.canAccessConversation(
      conversationId,
      socket.user,
    );

    if (!canAccess) return;

    socket.to(`conversation_${conversationId}`).emit(event, payload);
  }

  addUserSocket(userId, socketId) {
    const key = String(userId);
    const sockets = this.userSockets.get(key) || new Set();
    sockets.add(socketId);
    this.userSockets.set(key, sockets);
  }

  removeUserSocket(userId, socketId, role) {
    const key = String(userId);
    const sockets = this.userSockets.get(key);
    if (!sockets) return;

    sockets.delete(socketId);

    if (sockets.size === 0) {
      this.userSockets.delete(key);
      this.setUserOffline(userId, role);
      return;
    }

    this.userSockets.set(key, sockets);
  }

  setUserOnline(userId, role) {
    const key = String(userId);
    const presence = {
      userId,
      role,
      online: true,
      lastSeen: null,
    };

    this.userPresence.set(key, presence);
    this.emitPresence(presence);
  }

  setUserOffline(userId, role) {
    const key = String(userId);
    const lastSeen = new Date();
    const presence = {
      userId,
      role,
      online: false,
      lastSeen,
    };

    this.userLastSeen.set(key, lastSeen);
    this.userPresence.set(key, presence);
    this.emitPresence(presence);
    this.emitPresence(presence, 'last_seen');
  }

  emitPresence(presence, event = 'presence_update') {
    if (presence.role === 'admin') {
      this.io.emit(event, presence);
      return;
    }

    this.io.to('agents_admin').emit(event, presence);
    this.sendToUserRoom(presence.userId, event, presence);
  }

  getPresenceSnapshot(role) {
    const snapshot = Array.from(this.userPresence.values());
    if (role === 'admin') return snapshot;
    return snapshot.filter((presence) => presence.role === 'admin');
  }

  emitChatMessage(conversationId, payload) {
    let target = this.io.to(`conversation_${conversationId}`);
    if (payload.message?.senderType === 'user') {
      target = target.to('agents_admin');
    }

    target.emit('receive_message', payload);
    target.emit('message_received', {
      message: payload.message,
      conversationId,
    });
    this.emitConversationUpdate(conversationId, {
      conversation: payload.conversation,
    });
  }

  emitMessageUpdated(conversationId, payload) {
    this.io.to(`conversation_${conversationId}`).emit('message_updated', payload);
  }

  emitConversationUpdate(conversationId, payload) {
    this.io.to(`conversation_${conversationId}`).emit('conversation_updated', payload);
  }

  emitSupportUpdate(conversationId, payload) {
    this.io
      .to(`conversation_${conversationId}`)
      .to('agents_admin')
      .emit('support_update', payload);
    this.emitConversationUpdate(conversationId, {
      conversation: payload.conversation,
    });
  }

  // Send notification to specific user
  sendToUser(userId, event, data) {
    const sockets = this.userSockets.get(String(userId));
    if (sockets) {
      sockets.forEach((socketId) => this.io.to(socketId).emit(event, data));
    }
  }

  // Send notification to user room
  sendToUserRoom(userId, event, data) {
    this.io.to(`user_${userId}`).emit(event, data);
  }

  // Broadcast to all connected users
  broadcast(event, data) {
    this.io.emit(event, data);
  }

  // Send to specific room
  sendToRoom(room, event, data) {
    this.io.to(room).emit(event, data);
  }

  // Update live scores
  updateLiveScores(sport, scores) {
    this.io.to(`live_scores_${sport}`).emit('live_scores_update', {
      sport,
      scores,
      timestamp: new Date()
    });
  }

  // Send notification
  sendNotification(userId, notification) {
    this.sendToUserRoom(userId, 'new_notification', notification);
  }

  // Update user balance in real-time
  updateUserBalance(userId, balance) {
    this.sendToUserRoom(userId, 'balance_update', {
      balance,
      timestamp: new Date()
    });
  }

  // Get connected users count
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  // Get connected users list
  getConnectedUsers() {
    return Array.from(this.connectedUsers.keys());
  }
}

module.exports = SocketServer;
