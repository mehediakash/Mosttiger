const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const ChatInternalNote = require("../models/ChatInternalNote");
const ChatSavedReply = require("../models/ChatSavedReply");
const ChatActivityLog = require("../models/ChatActivityLog");

class ConversationServiceError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "ConversationServiceError";
    this.statusCode = statusCode;
  }
}

const isAdmin = (user) => user?.role === "admin" || user?.role === "moderator";
const VALID_TAGS = [
  "general",
  "deposit",
  "withdraw",
  "promotion",
  "affiliate",
  "referral",
  "technical",
  "vip",
  "complaint",
  "fraud_review",
];
const VALID_STATUSES = ["open", "pending", "resolved", "closed", "archived"];
const VALID_PRIORITIES = ["low", "normal", "high", "urgent"];
const USER_PUBLIC_FIELDS = "_id username fullName profilePhoto";

const normalizePagination = ({ page = 1, limit = 20 } = {}) => {
  const currentPage = Math.max(parseInt(page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  return { currentPage, pageSize };
};

const ensureValidObjectId = (id, label = "ID") => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ConversationServiceError(`Invalid ${label}`, 400);
  }
};

const ensureAdmin = (user) => {
  if (!isAdmin(user)) {
    throw new ConversationServiceError("Admin access is required", 403);
  }
};

const sanitizeText = (value, maxLength = 5000) =>
  typeof value === "string"
    ? value
        .replace(/\u0000/g, "")
        .trim()
        .slice(0, maxLength)
    : "";

const escapeCsv = (value) => {
  const text = value === undefined || value === null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

const escapePdfText = (value) =>
  String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[\r\n]+/g, " ");

const buildSimplePdfBuffer = (text) => {
  const lines = String(text || "")
    .split("\n")
    .flatMap((line) => {
      if (line.length <= 96) return [line];
      const chunks = [];
      for (let index = 0; index < line.length; index += 96) {
        chunks.push(line.slice(index, index + 96));
      }
      return chunks;
    })
    .slice(0, 120);

  const content = [
    "BT",
    "/F1 9 Tf",
    "36 806 Td",
    "12 TL",
    ...lines.map((line, index) =>
      index === 0
        ? `(${escapePdfText(line)}) Tj`
        : `T* (${escapePdfText(line)}) Tj`,
    ),
    "ET",
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];

  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(body);
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

class ConversationService {
  async createConversation(user) {
    if (!user?._id) {
      throw new ConversationServiceError("Authentication is required", 401);
    }

    if (isAdmin(user)) {
      throw new ConversationServiceError(
        "Admins cannot create user chat conversations",
        403,
      );
    }

    const userId = user._id;
    const existingOpenConversation = await Conversation.findOne({
      user: userId,
      status: "open",
    })
      .populate("user", USER_PUBLIC_FIELDS)
      .lean();

    if (existingOpenConversation) {
      return {
        conversation: normalizeConversationUser(existingOpenConversation),
        reused: true,
      };
    }

    try {
      const conversation = await Conversation.create({
        user: userId,
        assignedAdmin: null,
        status: "open",
        priority: "normal",
        unreadCount: {
          user: 0,
          admin: 0,
        },
      });

      await conversation.populate("user", USER_PUBLIC_FIELDS);
      return {
        conversation: normalizeConversationUser(conversation),
        reused: false,
      };
    } catch (error) {
      if (error.code === 11000) {
        const conversation = await Conversation.findOne({
          user: userId,
          status: "open",
        })
          .populate("user", USER_PUBLIC_FIELDS)
          .lean();

        if (conversation) {
          return {
            conversation: normalizeConversationUser(conversation),
            reused: true,
          };
        }
      }

      throw error;
    }
  }

  async getConversations(user, options = {}) {
    const { currentPage, pageSize } = normalizePagination(options);
    const {
      status,
      priority,
      tag,
      assignedAdmin,
      startDate,
      endDate,
      q,
      search,
      includeArchived,
    } = options;
    const query = {};

    if (status && !VALID_STATUSES.includes(String(status))) {
      throw new ConversationServiceError("Invalid conversation status", 422);
    }

    if (priority && !VALID_PRIORITIES.includes(String(priority))) {
      throw new ConversationServiceError("Invalid priority", 422);
    }

    if (tag) {
      const normalizedTag = String(tag)
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "_");
      if (!VALID_TAGS.includes(normalizedTag)) {
        throw new ConversationServiceError("Invalid chat tag", 422);
      }
    }

    if (!isAdmin(user)) {
      query.user = user._id;
      query.status = { $ne: "archived" };
    } else if (!includeArchived && status !== "archived") {
      query.status = { $ne: "archived" };
    }

    if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    if (tag) {
      query.tags = String(tag).toLowerCase().trim().replace(/\s+/g, "_");
    }

    if (assignedAdmin) {
      if (assignedAdmin === "unassigned") {
        query.assignedAdmin = null;
      } else {
        ensureValidObjectId(assignedAdmin, "assigned admin ID");
        query.assignedAdmin = assignedAdmin;
      }
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const searchTerm = sanitizeText(q || search, 120);
    if (searchTerm) {
      const or = [
        { priority: searchTerm.toLowerCase() },
        { status: searchTerm.toLowerCase() },
        { tags: searchTerm.toLowerCase().replace(/\s+/g, "_") },
      ];

      if (mongoose.Types.ObjectId.isValid(searchTerm)) {
        or.push({ _id: searchTerm });
      }

      const [matchedUsers, matchedMessages] = await Promise.all([
        User.find({
          $or: [
            { username: { $regex: searchTerm, $options: "i" } },
            { fullName: { $regex: searchTerm, $options: "i" } },
            { email: { $regex: searchTerm, $options: "i" } },
            { phone: { $regex: searchTerm, $options: "i" } },
          ],
        })
          .select("_id")
          .limit(50)
          .lean(),
        Message.find({ message: { $regex: searchTerm, $options: "i" } })
          .select("conversation")
          .limit(100)
          .lean(),
      ]);

      if (matchedUsers.length) {
        or.push({ user: { $in: matchedUsers.map((entry) => entry._id) } });
        or.push({
          assignedAdmin: { $in: matchedUsers.map((entry) => entry._id) },
        });
      }

      if (matchedMessages.length) {
        or.push({
          _id: { $in: matchedMessages.map((entry) => entry.conversation) },
        });
      }

      query.$or = or;
    }

    const [conversations, total] = await Promise.all([
      Conversation.find(query)
        .sort({ lastMessageTime: -1, updatedAt: -1, createdAt: -1 })
        .limit(pageSize)
        .skip((currentPage - 1) * pageSize)
        .populate("user", USER_PUBLIC_FIELDS)
        .lean(),
      Conversation.countDocuments(query),
    ]);

    return {
      conversations: conversations.map(normalizeConversationUser),
      totalPages: Math.ceil(total / pageSize),
      currentPage,
      total,
    };
  }

  async getConversationDetails(conversationId, user) {
    ensureValidObjectId(conversationId, "conversation ID");

    const query = { _id: conversationId };

    if (!isAdmin(user)) {
      query.user = user._id;
    }

    const conversation = await Conversation.findOne(query)
      .populate("user", USER_PUBLIC_FIELDS)
      .lean();

    if (!conversation) {
      throw new ConversationServiceError("Conversation not found", 404);
    }

    return normalizeConversationUser(conversation);
  }

  async closeConversation(conversationId, user) {
    ensureValidObjectId(conversationId, "conversation ID");

    const query = { _id: conversationId };

    if (!isAdmin(user)) {
      query.user = user._id;
    }

    const conversation = await Conversation.findOne(query);

    if (!conversation) {
      throw new ConversationServiceError("Conversation not found", 404);
    }

    if (conversation.status === "closed") {
      await conversation.populate("user", USER_PUBLIC_FIELDS);
      return normalizeConversationUser(conversation);
    }

    conversation.status = "closed";
    conversation.closedAt = new Date();
    conversation.closedBy = user._id;

    await conversation.save();

    await this.logActivity(conversation._id, user, "close", {});

    await conversation.populate("user", USER_PUBLIC_FIELDS);
    return normalizeConversationUser(conversation);
  }

  async logActivity(conversationId, admin, action, metadata = {}) {
    if (!isAdmin(admin)) return null;

    return ChatActivityLog.create({
      conversation: conversationId,
      admin: admin._id,
      action,
      metadata,
    });
  }

  async assignConversation(conversationId, admin, assignedAdminId) {
    ensureAdmin(admin);
    ensureValidObjectId(conversationId, "conversation ID");

    if (assignedAdminId)
      ensureValidObjectId(assignedAdminId, "assigned admin ID");

    const conversation = await Conversation.findById(conversationId);
    if (!conversation)
      throw new ConversationServiceError("Conversation not found", 404);

    if (assignedAdminId) {
      const targetAdmin = await User.findOne({
        _id: assignedAdminId,
        role: "admin",
      }).lean();
      if (!targetAdmin)
        throw new ConversationServiceError("Assigned admin not found", 404);
    }

    const previousAdmin = conversation.assignedAdmin || null;
    const now = new Date();

    conversation.assignedAdmin = assignedAdminId || null;
    conversation.assignedAt = assignedAdminId ? now : null;
    conversation.assignedBy = assignedAdminId ? admin._id : null;
    conversation.assignmentHistory.push({
      assignedAdmin: assignedAdminId || null,
      assignedBy: admin._id,
      assignedAt: now,
      previousAdmin,
    });

    await conversation.save();
    await this.logActivity(conversation._id, admin, "assignment", {
      assignedAdmin: assignedAdminId || null,
      previousAdmin,
    });

    await conversation.populate("user", USER_PUBLIC_FIELDS);
    return normalizeConversationUser(conversation);
  }

  async updateStatus(conversationId, admin, status) {
    ensureAdmin(admin);
    ensureValidObjectId(conversationId, "conversation ID");
    if (!VALID_STATUSES.includes(status)) {
      throw new ConversationServiceError("Invalid conversation status", 422);
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation)
      throw new ConversationServiceError("Conversation not found", 404);

    const previousStatus = conversation.status;
    conversation.status = status;

    if (status === "resolved") {
      conversation.resolvedAt = new Date();
      conversation.resolvedBy = admin._id;
    }

    if (status === "closed") {
      conversation.closedAt = new Date();
      conversation.closedBy = admin._id;
      if (!conversation.resolvedAt) {
        conversation.resolvedAt = conversation.closedAt;
        conversation.resolvedBy = admin._id;
      }
    }

    if (status === "archived") {
      conversation.archivedAt = new Date();
      conversation.archivedBy = admin._id;
    }

    await conversation.save();
    await this.logActivity(
      conversation._id,
      admin,
      status === "resolved" ? "resolve" : "status_change",
      {
        previousStatus,
        status,
      },
    );

    await conversation.populate("user", USER_PUBLIC_FIELDS);
    return normalizeConversationUser(conversation);
  }

  async updatePriority(conversationId, admin, priority) {
    ensureAdmin(admin);
    ensureValidObjectId(conversationId, "conversation ID");
    if (!VALID_PRIORITIES.includes(priority)) {
      throw new ConversationServiceError("Invalid priority", 422);
    }

    const conversation = await Conversation.findByIdAndUpdate(
      conversationId,
      { $set: { priority, updatedAt: new Date() } },
      { new: true },
    ).lean();

    if (!conversation)
      throw new ConversationServiceError("Conversation not found", 404);
    await this.logActivity(conversation._id, admin, "priority_change", {
      priority,
    });
    return normalizeConversationUser(
      await Conversation.findById(conversation._id)
        .populate("user", USER_PUBLIC_FIELDS)
        .lean(),
    );
  }

  async updateTags(conversationId, admin, tags = []) {
    ensureAdmin(admin);
    ensureValidObjectId(conversationId, "conversation ID");
    const normalizedTags = [...new Set(Array.isArray(tags) ? tags : [])].map(
      (tag) => String(tag).toLowerCase().trim().replace(/\s+/g, "_"),
    );

    if (normalizedTags.some((tag) => !VALID_TAGS.includes(tag))) {
      throw new ConversationServiceError("Invalid chat tag", 422);
    }

    const conversation = await Conversation.findByIdAndUpdate(
      conversationId,
      { $set: { tags: normalizedTags, updatedAt: new Date() } },
      { new: true },
    ).lean();

    if (!conversation)
      throw new ConversationServiceError("Conversation not found", 404);
    await this.logActivity(conversation._id, admin, "tag_update", {
      tags: normalizedTags,
    });
    return normalizeConversationUser(
      await Conversation.findById(conversation._id)
        .populate("user", USER_PUBLIC_FIELDS)
        .lean(),
    );
  }

  async archiveConversation(conversationId, admin) {
    const conversation = await this.updateStatus(
      conversationId,
      admin,
      "archived",
    );
    await this.logActivity(conversationId, admin, "archive", {});
    return conversation;
  }

  async restoreConversation(conversationId, admin) {
    ensureAdmin(admin);
    ensureValidObjectId(conversationId, "conversation ID");
    const conversation = await Conversation.findByIdAndUpdate(
      conversationId,
      {
        $set: {
          status: "open",
          archivedAt: null,
          archivedBy: null,
          updatedAt: new Date(),
        },
      },
      { new: true },
    ).lean();

    if (!conversation)
      throw new ConversationServiceError("Conversation not found", 404);
    await this.logActivity(conversation._id, admin, "restore", {});
    return normalizeConversationUser(
      await Conversation.findById(conversation._id)
        .populate("user", USER_PUBLIC_FIELDS)
        .lean(),
    );
  }

  async updateChatRestriction(conversationId, admin, payload = {}) {
    ensureAdmin(admin);
    ensureValidObjectId(conversationId, "conversation ID");

    const disabledUntil = payload.disabledUntil
      ? new Date(payload.disabledUntil)
      : null;
    const conversation = await Conversation.findByIdAndUpdate(
      conversationId,
      {
        $set: {
          chatRestriction: {
            blocked: Boolean(payload.blocked),
            muted: Boolean(payload.muted),
            disabledUntil,
            reason: sanitizeText(payload.reason, 500),
            updatedBy: admin._id,
            updatedAt: new Date(),
          },
          updatedAt: new Date(),
        },
      },
      { new: true },
    ).lean();

    if (!conversation)
      throw new ConversationServiceError("Conversation not found", 404);
    await this.logActivity(conversation._id, admin, "chat_restriction_update", {
      chatRestriction: conversation.chatRestriction,
    });
    return normalizeConversationUser(
      await Conversation.findById(conversation._id)
        .populate("user", USER_PUBLIC_FIELDS)
        .lean(),
    );
  }

  async rateConversation(conversationId, user, { score, feedback = "" } = {}) {
    ensureValidObjectId(conversationId, "conversation ID");
    const parsedScore = Number(score);
    if (!Number.isInteger(parsedScore) || parsedScore < 1 || parsedScore > 5) {
      throw new ConversationServiceError("Rating must be between 1 and 5", 422);
    }

    const conversation = await Conversation.findOneAndUpdate(
      {
        _id: conversationId,
        user: user._id,
        status: { $in: ["resolved", "closed"] },
      },
      {
        $set: {
          rating: {
            score: parsedScore,
            feedback: sanitizeText(feedback, 1000),
            createdAt: new Date(),
          },
          updatedAt: new Date(),
        },
      },
      { new: true },
    ).lean();

    if (!conversation) {
      throw new ConversationServiceError(
        "Conversation not found or not ready for rating",
        404,
      );
    }

    return normalizeConversationUser(
      await Conversation.findById(conversation._id)
        .populate("user", USER_PUBLIC_FIELDS)
        .lean(),
    );
  }

  async createNote(conversationId, admin, note) {
    ensureAdmin(admin);
    await this.getConversationDetails(conversationId, admin);
    const sanitizedNote = sanitizeText(note);
    if (!sanitizedNote)
      throw new ConversationServiceError("Note cannot be empty", 400);

    const createdNote = await ChatInternalNote.create({
      conversation: conversationId,
      author: admin._id,
      note: sanitizedNote,
    });

    await this.logActivity(conversationId, admin, "internal_note_create", {
      noteId: createdNote._id,
    });
    return createdNote.toObject();
  }

  async getNotes(conversationId, admin) {
    ensureAdmin(admin);
    await this.getConversationDetails(conversationId, admin);
    return ChatInternalNote.find({
      conversation: conversationId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .lean();
  }

  async updateNote(noteId, admin, note) {
    ensureAdmin(admin);
    ensureValidObjectId(noteId, "note ID");
    const sanitizedNote = sanitizeText(note);
    if (!sanitizedNote)
      throw new ConversationServiceError("Note cannot be empty", 400);

    const updatedNote = await ChatInternalNote.findOneAndUpdate(
      { _id: noteId, isDeleted: false },
      { $set: { note: sanitizedNote, updatedAt: new Date() } },
      { new: true },
    ).lean();

    if (!updatedNote) throw new ConversationServiceError("Note not found", 404);
    await this.logActivity(
      updatedNote.conversation,
      admin,
      "internal_note_edit",
      { noteId },
    );
    return updatedNote;
  }

  async deleteNote(noteId, admin) {
    ensureAdmin(admin);
    ensureValidObjectId(noteId, "note ID");
    const deletedNote = await ChatInternalNote.findOneAndUpdate(
      { _id: noteId, isDeleted: false },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: admin._id,
          updatedAt: new Date(),
        },
      },
      { new: true },
    ).lean();

    if (!deletedNote) throw new ConversationServiceError("Note not found", 404);
    await this.logActivity(
      deletedNote.conversation,
      admin,
      "internal_note_delete",
      { noteId },
    );
    return deletedNote;
  }

  async getSavedReplies(admin, options = {}) {
    ensureAdmin(admin);
    const query = { isActive: true };
    const searchTerm = sanitizeText(options.q || options.search, 120);
    if (searchTerm) {
      query.$or = [
        { title: { $regex: searchTerm, $options: "i" } },
        { message: { $regex: searchTerm, $options: "i" } },
        { category: { $regex: searchTerm, $options: "i" } },
      ];
    }

    return ChatSavedReply.find(query).sort({ updatedAt: -1 }).limit(100).lean();
  }

  async createSavedReply(admin, payload = {}) {
    ensureAdmin(admin);
    const title = sanitizeText(payload.title, 120);
    const message = sanitizeText(payload.message);
    if (!title || !message) {
      throw new ConversationServiceError("Title and message are required", 400);
    }

    const reply = await ChatSavedReply.create({
      title,
      message,
      category: sanitizeText(payload.category, 80) || "general",
      createdBy: admin._id,
    });

    await ChatActivityLog.create({
      conversation: null,
      admin: admin._id,
      action: "saved_reply_create",
      metadata: { replyId: reply._id, title },
    });
    return reply.toObject();
  }

  async updateSavedReply(replyId, admin, payload = {}) {
    ensureAdmin(admin);
    ensureValidObjectId(replyId, "saved reply ID");
    const updates = { updatedBy: admin._id, updatedAt: new Date() };
    if (payload.title !== undefined)
      updates.title = sanitizeText(payload.title, 120);
    if (payload.message !== undefined)
      updates.message = sanitizeText(payload.message);
    if (payload.category !== undefined)
      updates.category = sanitizeText(payload.category, 80);

    const reply = await ChatSavedReply.findOneAndUpdate(
      { _id: replyId, isActive: true },
      { $set: updates },
      { new: true },
    ).lean();
    if (!reply)
      throw new ConversationServiceError("Saved reply not found", 404);
    await ChatActivityLog.create({
      conversation: null,
      admin: admin._id,
      action: "saved_reply_edit",
      metadata: { replyId },
    });
    return reply;
  }

  async deleteSavedReply(replyId, admin) {
    ensureAdmin(admin);
    ensureValidObjectId(replyId, "saved reply ID");
    const reply = await ChatSavedReply.findOneAndUpdate(
      { _id: replyId, isActive: true },
      {
        $set: { isActive: false, updatedBy: admin._id, updatedAt: new Date() },
      },
      { new: true },
    ).lean();
    if (!reply)
      throw new ConversationServiceError("Saved reply not found", 404);
    await ChatActivityLog.create({
      conversation: null,
      admin: admin._id,
      action: "saved_reply_delete",
      metadata: { replyId },
    });
    return reply;
  }

  async useSavedReply(replyId, admin) {
    ensureAdmin(admin);
    ensureValidObjectId(replyId, "saved reply ID");
    const reply = await ChatSavedReply.findOneAndUpdate(
      { _id: replyId, isActive: true },
      { $inc: { usageCount: 1 }, $set: { updatedAt: new Date() } },
      { new: true },
    ).lean();
    if (!reply)
      throw new ConversationServiceError("Saved reply not found", 404);
    return reply;
  }

  async getAnalytics(admin) {
    ensureAdmin(admin);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const week = new Date(now);
    week.setDate(now.getDate() - 7);
    const month = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalConversations,
      byStatus,
      averageRating,
      messagesToday,
      messagesThisWeek,
      messagesThisMonth,
      closedConversations,
      firstAdminMessages,
    ] = await Promise.all([
      Conversation.countDocuments(),
      Conversation.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Conversation.aggregate([
        { $match: { "rating.score": { $ne: null } } },
        { $group: { _id: null, averageRating: { $avg: "$rating.score" } } },
      ]),
      Message.countDocuments({ createdAt: { $gte: today } }),
      Message.countDocuments({ createdAt: { $gte: week } }),
      Message.countDocuments({ createdAt: { $gte: month } }),
      Conversation.find({ closedAt: { $ne: null } })
        .select("createdAt closedAt")
        .lean(),
      Message.aggregate([
        { $match: { senderType: "admin" } },
        { $sort: { createdAt: 1 } },
        {
          $group: {
            _id: "$conversation",
            firstReplyAt: { $first: "$createdAt" },
          },
        },
      ]),
    ]);

    const firstReplyByConversation = new Map(
      firstAdminMessages.map((entry) => [
        String(entry._id),
        entry.firstReplyAt,
      ]),
    );
    const responseSamples = await Conversation.find({
      _id: { $in: firstAdminMessages.map((entry) => entry._id) },
    })
      .select("_id createdAt")
      .lean();
    const responseDurations = responseSamples
      .map((conversation) => {
        const firstReplyAt = firstReplyByConversation.get(
          String(conversation._id),
        );
        return firstReplyAt
          ? new Date(firstReplyAt) - new Date(conversation.createdAt)
          : null;
      })
      .filter((value) => Number.isFinite(value) && value >= 0);
    const resolutionDurations = closedConversations
      .map(
        (conversation) =>
          new Date(conversation.closedAt) - new Date(conversation.createdAt),
      )
      .filter((value) => Number.isFinite(value) && value >= 0);
    const statusMap = byStatus.reduce((acc, entry) => {
      acc[entry._id || "unknown"] = entry.count;
      return acc;
    }, {});

    return {
      totalConversations,
      open: statusMap.open || 0,
      pending: statusMap.pending || 0,
      resolved: statusMap.resolved || 0,
      closed: statusMap.closed || 0,
      archived: statusMap.archived || 0,
      averageResponseTimeMs: responseDurations.length
        ? Math.round(
            responseDurations.reduce((sum, value) => sum + value, 0) /
              responseDurations.length,
          )
        : 0,
      averageResolutionTimeMs: resolutionDurations.length
        ? Math.round(
            resolutionDurations.reduce((sum, value) => sum + value, 0) /
              resolutionDurations.length,
          )
        : 0,
      averageRating: averageRating[0]?.averageRating || 0,
      messagesToday,
      messagesThisWeek,
      messagesThisMonth,
    };
  }

  async exportConversation(conversationId, admin, format = "txt") {
    ensureAdmin(admin);
    const conversation = await this.getConversationDetails(
      conversationId,
      admin,
    );
    const messages = await Message.find({
      conversation: conversationId,
      "deleted.isDeleted": false,
    })
      .populate("attachment")
      .sort({ createdAt: 1 })
      .lean();

    const rows = messages.map((message) => ({
      createdAt: message.createdAt,
      senderType: message.senderType,
      messageType: message.messageType,
      message: message.message,
      attachment: message.attachment?.cloudinaryUrl || "",
      attachmentName: message.attachment?.originalName || "",
    }));

    await this.logActivity(conversationId, admin, "conversation_export", {
      format,
    });

    if (format === "csv") {
      const header = [
        "createdAt",
        "senderType",
        "messageType",
        "message",
        "attachmentName",
        "attachment",
      ];
      return {
        contentType: "text/csv",
        filename: `conversation-${conversationId}.csv`,
        body: [
          header.map(escapeCsv).join(","),
          ...rows.map((row) =>
            header.map((key) => escapeCsv(row[key])).join(","),
          ),
        ].join("\n"),
      };
    }

    const text = [
      `Conversation: ${conversationId}`,
      `Status: ${conversation.status}`,
      `Priority: ${conversation.priority}`,
      `Tags: ${(conversation.tags || []).join(", ")}`,
      "",
      ...rows.map(
        (row) =>
          `[${new Date(row.createdAt).toISOString()}] ${row.senderType}/${row.messageType}: ${row.message}${row.attachment ? ` ${row.attachment}` : ""}`,
      ),
      `Attachments: ${rows.filter((row) => row.attachment).length}`,
    ].join("\n");

    if (format === "pdf") {
      return {
        contentType: "application/pdf",
        filename: `conversation-${conversationId}.pdf`,
        body: buildSimplePdfBuffer(text),
      };
    }

    return {
      contentType: "text/plain",
      filename: `conversation-${conversationId}.txt`,
      body: text,
    };
  }

  async canAccessConversation(conversationId, user) {
    if (!user?._id || !mongoose.Types.ObjectId.isValid(conversationId)) {
      return false;
    }

    const query = { _id: conversationId };

    if (!isAdmin(user)) {
      query.user = user._id;
    }

    return Boolean(await Conversation.exists(query));
  }
}

module.exports = new ConversationService();
module.exports.ConversationServiceError = ConversationServiceError;
