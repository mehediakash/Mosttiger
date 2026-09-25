const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Attachment = require("../models/Attachment");
const cloudinaryUploadService = require("./cloudinaryUploadService");

class MessageServiceError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "MessageServiceError";
    this.statusCode = statusCode;
  }
}

const VALID_MESSAGE_TYPES = ["text", "image", "file", "system"];
const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const USER_PUBLIC_FIELDS = "_id username fullName profilePhoto";

const isAdmin = (user) => user?.role === "admin" || user?.role === "moderator";

const normalizePagination = ({ page = 1, limit = 30 } = {}) => {
  const currentPage = Math.max(parseInt(page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 100);

  return { currentPage, pageSize };
};

const ensureValidObjectId = (id, label = "ID") => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new MessageServiceError(`Invalid ${label}`, 400);
  }
};

const sanitizeMessage = (value) => {
  if (typeof value !== "string") return "";

  return value
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
};

const normalizeClientMessageId = (value) => {
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= 120 ? normalized : null;
};

const normalizePublicUser = (user) => {
  if (!user || typeof user !== "object") return user;

  const plainUser = user.toObject ? user.toObject() : user;
  return {
    _id: plainUser._id,
    username: plainUser.username || "",
    fullName: plainUser.fullName || "",
    name: plainUser.fullName || plainUser.username || "",
    profilePhoto: plainUser.profilePhoto || null,
    avatar: plainUser.profilePhoto || null,
  };
};

const normalizeConversationUser = (conversation) => {
  if (!conversation) return conversation;

  const plainConversation = conversation.toObject
    ? conversation.toObject()
    : conversation;

  return {
    ...plainConversation,
    user: normalizePublicUser(plainConversation.user),
  };
};

const findConversationWithUser = (conversationId) =>
  Conversation.findById(conversationId)
    .populate("user", USER_PUBLIC_FIELDS)
    .lean()
    .then(normalizeConversationUser);

class MessageService {
  getSenderType(user, messageType) {
    if (messageType === "system") return "system";
    return isAdmin(user) ? "admin" : "user";
  }

  async getAccessibleConversation(conversationId, user) {
    ensureValidObjectId(conversationId, "conversation ID");

    const query = { _id: conversationId };

    if (!isAdmin(user)) {
      query.user = user._id;
    }

    const conversation = await Conversation.findOne(query);

    if (!conversation) {
      throw new MessageServiceError("Conversation not found", 404);
    }

    return conversation;
  }

  validateMessageInput({ user, conversation, messageType, message, file }) {
    if (!user?._id) {
      throw new MessageServiceError("Authentication is required", 401);
    }

    if (["closed", "archived"].includes(conversation.status)) {
      throw new MessageServiceError("Conversation is closed", 400);
    }

    if (!isAdmin(user)) {
      if (conversation.status === "resolved") {
        throw new MessageServiceError("Conversation is resolved", 400);
      }

      const restriction = conversation.chatRestriction || {};
      const disabledUntil = restriction.disabledUntil
        ? new Date(restriction.disabledUntil)
        : null;

      if (restriction.blocked) {
        throw new MessageServiceError(
          "Live chat is blocked for this conversation",
          403,
        );
      }

      if (restriction.muted) {
        throw new MessageServiceError(
          "Live chat is muted for this conversation",
          403,
        );
      }

      if (disabledUntil && disabledUntil > new Date()) {
        throw new MessageServiceError("Live chat is temporarily disabled", 403);
      }
    }

    if (!VALID_MESSAGE_TYPES.includes(messageType)) {
      throw new MessageServiceError("Invalid message type", 422);
    }

    if (messageType === "system" && !isAdmin(user)) {
      throw new MessageServiceError(
        "Only admins can send system messages",
        403,
      );
    }

    if (file && !["image", "file"].includes(messageType)) {
      throw new MessageServiceError(
        "Attachment messages must use image or file message type",
        422,
      );
    }

    if (["image", "file"].includes(messageType) && !file) {
      throw new MessageServiceError("Attachment file is required", 400);
    }

    if (messageType === "image" && !IMAGE_MIME_TYPES.includes(file?.mimetype)) {
      throw new MessageServiceError(
        "Image message requires an image file",
        422,
      );
    }

    if (messageType === "file" && file?.mimetype !== "application/pdf") {
      throw new MessageServiceError("File message requires a PDF file", 422);
    }

    if (["text", "system"].includes(messageType) && !message) {
      throw new MessageServiceError("Message cannot be empty", 400);
    }

    if (!message && !file) {
      throw new MessageServiceError("Message cannot be empty", 400);
    }
  }

  async findDuplicateMessage({ conversationId, userId, clientMessageId }) {
    if (!clientMessageId || !userId) return null;

    return Message.findOne({
      conversation: conversationId,
      sender: userId,
      clientMessageId,
    })
      .populate("attachment")
      .lean();
  }

  async createMessage({
    conversationId,
    user,
    messageType = null,
    message = "",
    file = null,
    clientMessageId = null,
  }) {
    const conversation = await this.getAccessibleConversation(
      conversationId,
      user,
    );
    const sanitizedMessage = sanitizeMessage(message);
    const normalizedClientMessageId = normalizeClientMessageId(clientMessageId);
    const resolvedMessageType =
      messageType ||
      (file?.mimetype === "application/pdf" ? "file" : file ? "image" : "text");

    this.validateMessageInput({
      user,
      conversation,
      messageType: resolvedMessageType,
      message: sanitizedMessage,
      file,
    });

    const senderType = this.getSenderType(user, resolvedMessageType);
    const sender = senderType === "system" ? null : user._id;
    const duplicateMessage = await this.findDuplicateMessage({
      conversationId: conversation._id,
      userId: sender,
      clientMessageId: normalizedClientMessageId,
    });

    if (duplicateMessage) {
      return {
        message: duplicateMessage,
        conversation: await findConversationWithUser(conversation._id),
        duplicate: true,
      };
    }

    let uploadedAttachment = null;

    if (file) {
      uploadedAttachment = await cloudinaryUploadService.uploadChatAttachment(
        file,
        { folder: "mosttiger/live-chat" },
      );
    }

    const session = await mongoose.startSession();

    try {
      let savedMessage;
      let updatedConversation;

      await session.withTransaction(async () => {
        const [createdMessage] = await Message.create(
          [
            {
              conversation: conversation._id,
              senderType,
              sender,
              messageType: resolvedMessageType,
              message: sanitizedMessage,
              clientMessageId: normalizedClientMessageId,
              readStatus: "unread",
            },
          ],
          { session },
        );

        savedMessage = createdMessage;

        if (uploadedAttachment) {
          const [attachment] = await Attachment.create(
            [
              {
                message: savedMessage._id,
                cloudinaryUrl:
                  uploadedAttachment.secureUrl || uploadedAttachment.url,
                cloudinaryPublicId: uploadedAttachment.publicId,
                originalName: file.originalname,
                mimeType: file.mimetype,
                fileSize: file.size,
              },
            ],
            { session },
          );

          savedMessage.attachment = attachment._id;
          await savedMessage.save({ session });
        }

        const unreadField =
          senderType === "admin" || senderType === "system"
            ? "unreadCount.user"
            : "unreadCount.admin";

        updatedConversation = await Conversation.findByIdAndUpdate(
          conversation._id,
          {
            $set: {
              lastMessage: savedMessage._id,
              lastMessageTime: savedMessage.createdAt,
              lastSender: {
                senderType,
                sender,
              },
              updatedAt: new Date(),
            },
            $inc: {
              [unreadField]: 1,
            },
          },
          { new: true, session },
        ).lean();
      });

      updatedConversation = await findConversationWithUser(conversation._id);

      const hydratedMessage = await Message.findById(savedMessage._id)
        .populate("attachment")
        .lean();

      return {
        message: hydratedMessage,
        conversation: updatedConversation,
        duplicate: false,
      };
    } catch (error) {
      if (uploadedAttachment?.publicId) {
        await cloudinaryUploadService.deleteChatAttachment(
          uploadedAttachment.publicId,
          file.mimetype,
        );
      }

      if (error.code === 11000 && normalizedClientMessageId) {
        const existingMessage = await this.findDuplicateMessage({
          conversationId: conversation._id,
          userId: sender,
          clientMessageId: normalizedClientMessageId,
        });

        if (existingMessage) {
          return {
            message: existingMessage,
            conversation: await findConversationWithUser(conversation._id),
            duplicate: true,
          };
        }
      }

      throw error;
    } finally {
      await session.endSession();
    }
  }

  async adminReply({
    conversationId,
    user,
    messageType = "text",
    message,
    file,
    clientMessageId,
  }) {
    if (!isAdmin(user)) {
      throw new MessageServiceError("Admin access is required", 403);
    }

    return this.createMessage({
      conversationId,
      user,
      messageType,
      message,
      file,
      clientMessageId,
    });
  }

  async getMessages(conversationId, user, options = {}) {
    await this.getAccessibleConversation(conversationId, user);

    const { currentPage, pageSize } = normalizePagination(options);
    const query = {
      conversation: conversationId,
      "deleted.isDeleted": false,
    };

    const [messages, total] = await Promise.all([
      Message.find(query)
        .populate("attachment")
        .sort({ createdAt: 1, _id: 1 })
        .limit(pageSize)
        .skip((currentPage - 1) * pageSize)
        .lean(),
      Message.countDocuments(query),
    ]);

    return {
      messages,
      totalPages: Math.ceil(total / pageSize),
      currentPage,
      total,
    };
  }

  async markConversationRead(conversationId, user) {
    const conversation = await this.getAccessibleConversation(
      conversationId,
      user,
    );
    const unreadField = isAdmin(user)
      ? "unreadCount.admin"
      : "unreadCount.user";
    const senderTypesToMark = isAdmin(user) ? ["user"] : ["admin", "system"];
    const seenAt = new Date();

    await Message.updateMany(
      {
        conversation: conversation._id,
        senderType: { $in: senderTypesToMark },
        deliveryStatus: { $ne: "seen" },
        "deleted.isDeleted": false,
      },
      {
        $set: {
          deliveryStatus: "seen",
          readStatus: "read",
          seenAt,
          deliveredAt: seenAt,
          updatedAt: seenAt,
        },
      },
    );

    const updatedConversation = await Conversation.findByIdAndUpdate(
      conversation._id,
      {
        $set: {
          [unreadField]: 0,
        },
      },
      { new: true },
    )
      .populate("user", USER_PUBLIC_FIELDS)
      .lean();

    return normalizeConversationUser(updatedConversation);
  }

  async markMessagesDelivered(conversationId, user) {
    const conversation = await this.getAccessibleConversation(
      conversationId,
      user,
    );
    const senderTypesToMark = isAdmin(user) ? ["user"] : ["admin", "system"];
    const deliveredAt = new Date();

    const result = await Message.updateMany(
      {
        conversation: conversation._id,
        senderType: { $in: senderTypesToMark },
        deliveryStatus: "sent",
        "deleted.isDeleted": false,
      },
      {
        $set: {
          deliveryStatus: "delivered",
          deliveredAt,
          updatedAt: deliveredAt,
        },
      },
    );

    const messages = await Message.find({
      conversation: conversation._id,
      senderType: { $in: senderTypesToMark },
      deliveredAt,
      "deleted.isDeleted": false,
    })
      .populate("attachment")
      .lean();

    return {
      conversation: normalizeConversationUser(
        await Conversation.findById(conversation._id)
          .populate("user", USER_PUBLIC_FIELDS)
          .lean(),
      ),
      messages,
      modifiedCount: result.modifiedCount || 0,
    };
  }

  async markMessagesSeen(conversationId, user) {
    const conversation = await this.markConversationRead(conversationId, user);
    const senderTypesToMark = isAdmin(user) ? ["user"] : ["admin", "system"];

    const messages = await Message.find({
      conversation: conversation._id,
      senderType: { $in: senderTypesToMark },
      deliveryStatus: "seen",
      "deleted.isDeleted": false,
    })
      .populate("attachment")
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    return {
      conversation,
      messages,
    };
  }

  async uploadAttachmentMessage({
    conversationId,
    user,
    file,
    message = "",
    clientMessageId = null,
  }) {
    const messageType = file?.mimetype === "application/pdf" ? "file" : "image";

    return this.createMessage({
      conversationId,
      user,
      messageType,
      message,
      file,
      clientMessageId,
    });
  }

  async deleteAttachment(attachmentId, user) {
    ensureValidObjectId(attachmentId, "attachment ID");

    const attachment = await Attachment.findById(attachmentId).lean();

    if (!attachment) {
      throw new MessageServiceError("Attachment not found", 404);
    }

    const message = await Message.findById(attachment.message).lean();

    if (!message) {
      throw new MessageServiceError("Message not found", 404);
    }

    await this.getAccessibleConversation(message.conversation, user);

    if (!isAdmin(user) && String(message.sender) !== String(user._id)) {
      throw new MessageServiceError(
        "You can delete only your own attachments",
        403,
      );
    }

    const deleteResult = await cloudinaryUploadService.deleteChatAttachment(
      attachment.cloudinaryPublicId,
      attachment.mimeType,
    );

    if (!deleteResult.deleted) {
      throw new MessageServiceError(
        deleteResult.reason || "Attachment could not be deleted",
        400,
      );
    }

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        await Attachment.deleteOne({ _id: attachment._id }).session(session);
        await Message.updateOne(
          { _id: message._id },
          {
            $set: {
              attachment: null,
              updatedAt: new Date(),
            },
          },
          { session },
        );
      });

      const updatedMessage = await Message.findById(message._id)
        .populate("attachment")
        .lean();
      const conversation = await findConversationWithUser(message.conversation);

      return {
        deleted: true,
        attachmentId,
        message: updatedMessage,
        conversation,
        cloudinary: deleteResult,
      };
    } finally {
      await session.endSession();
    }
  }
}

module.exports = new MessageService();
module.exports.MessageServiceError = MessageServiceError;
