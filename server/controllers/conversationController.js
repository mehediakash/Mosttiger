const conversationService = require("../services/conversationService");
const {
  ConversationServiceError,
} = require("../services/conversationService");
const messageService = require("../services/messageService");
const { MessageServiceError } = require("../services/messageService");

const handleConversationError = (res, error, fallbackMessage) => {
  if (
    error instanceof ConversationServiceError ||
    error instanceof MessageServiceError ||
    error.name === "CloudinaryUploadError"
  ) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  console.error(fallbackMessage, error);

  return res.status(500).json({
    success: false,
    message: fallbackMessage,
  });
};

const emitMessageEvents = (req, result) => {
  const socketServer = req.app.get("socketServer");

  if (!socketServer || result.duplicate) return;

  socketServer.emitChatMessage(result.conversation._id, {
    message: result.message,
    conversation: result.conversation,
  });
};

const emitConversationUpdate = (req, conversation) => {
  const socketServer = req.app.get("socketServer");

  if (!socketServer) return;

  socketServer.emitConversationUpdate(conversation._id, { conversation });
};

const emitSupportUpdate = (req, conversation, type, data = {}) => {
  const socketServer = req.app.get("socketServer");

  if (!socketServer) return;

  socketServer.emitSupportUpdate(conversation._id || conversation, {
    type,
    conversation,
    ...data,
  });
};

exports.createConversation = async (req, res) => {
  try {
    const result = await conversationService.createConversation(req.user);

    return res.status(result.reused ? 200 : 201).json({
      success: true,
      message: result.reused
        ? "Open conversation reused"
        : "Conversation created successfully",
      data: result,
    });
  } catch (error) {
    return handleConversationError(
      res,
      error,
      "Server error while creating conversation",
    );
  }
};

exports.getMyConversations = async (req, res) => {
  try {
    const result = await conversationService.getConversations(req.user, req.query);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleConversationError(
      res,
      error,
      "Server error while fetching conversations",
    );
  }
};

exports.getConversationDetails = async (req, res) => {
  try {
    const conversation = await conversationService.getConversationDetails(
      req.params.id,
      req.user,
    );
    const updatedConversation = await messageService.markConversationRead(
      req.params.id,
      req.user,
    );
    emitConversationUpdate(req, updatedConversation);

    return res.status(200).json({
      success: true,
      data: {
        conversation: updatedConversation || conversation,
      },
    });
  } catch (error) {
    return handleConversationError(
      res,
      error,
      "Server error while fetching conversation",
    );
  }
};

exports.closeConversation = async (req, res) => {
  try {
    const conversation = await conversationService.closeConversation(
      req.params.id,
      req.user,
    );
    emitSupportUpdate(req, conversation, "status_change");

    return res.status(200).json({
      success: true,
      message: "Conversation closed successfully",
      data: {
        conversation,
      },
    });
  } catch (error) {
    return handleConversationError(
      res,
      error,
      "Server error while closing conversation",
    );
  }
};

exports.assignConversation = async (req, res) => {
  try {
    const conversation = await conversationService.assignConversation(
      req.params.id,
      req.user,
      req.body.assignedAdmin || req.body.assignedAdminId || null,
    );
    emitSupportUpdate(req, conversation, "assignment");
    return res.status(200).json({ success: true, message: "Conversation assigned", data: { conversation } });
  } catch (error) {
    return handleConversationError(res, error, "Server error while assigning conversation");
  }
};

exports.updateConversationStatus = async (req, res) => {
  try {
    const conversation = await conversationService.updateStatus(
      req.params.id,
      req.user,
      req.body.status,
    );
    emitSupportUpdate(req, conversation, "status_change");
    return res.status(200).json({ success: true, message: "Conversation status updated", data: { conversation } });
  } catch (error) {
    return handleConversationError(res, error, "Server error while updating conversation status");
  }
};

exports.updateConversationPriority = async (req, res) => {
  try {
    const conversation = await conversationService.updatePriority(
      req.params.id,
      req.user,
      req.body.priority,
    );
    emitSupportUpdate(req, conversation, "priority_change");
    return res.status(200).json({ success: true, message: "Conversation priority updated", data: { conversation } });
  } catch (error) {
    return handleConversationError(res, error, "Server error while updating priority");
  }
};

exports.updateConversationTags = async (req, res) => {
  try {
    const conversation = await conversationService.updateTags(
      req.params.id,
      req.user,
      req.body.tags,
    );
    emitSupportUpdate(req, conversation, "tag_update");
    return res.status(200).json({ success: true, message: "Conversation tags updated", data: { conversation } });
  } catch (error) {
    return handleConversationError(res, error, "Server error while updating tags");
  }
};

exports.archiveConversation = async (req, res) => {
  try {
    const conversation = await conversationService.archiveConversation(req.params.id, req.user);
    emitSupportUpdate(req, conversation, "archive");
    return res.status(200).json({ success: true, message: "Conversation archived", data: { conversation } });
  } catch (error) {
    return handleConversationError(res, error, "Server error while archiving conversation");
  }
};

exports.restoreConversation = async (req, res) => {
  try {
    const conversation = await conversationService.restoreConversation(req.params.id, req.user);
    emitSupportUpdate(req, conversation, "restore");
    return res.status(200).json({ success: true, message: "Conversation restored", data: { conversation } });
  } catch (error) {
    return handleConversationError(res, error, "Server error while restoring conversation");
  }
};

exports.updateChatRestriction = async (req, res) => {
  try {
    const conversation = await conversationService.updateChatRestriction(
      req.params.id,
      req.user,
      req.body,
    );
    emitSupportUpdate(req, conversation, "chat_restriction_update");
    return res.status(200).json({ success: true, message: "Chat restriction updated", data: { conversation } });
  } catch (error) {
    return handleConversationError(res, error, "Server error while updating chat restriction");
  }
};

exports.rateConversation = async (req, res) => {
  try {
    const conversation = await conversationService.rateConversation(
      req.params.id,
      req.user,
      req.body,
    );
    emitSupportUpdate(req, conversation, "rating");
    return res.status(200).json({ success: true, message: "Support rating submitted", data: { conversation } });
  } catch (error) {
    return handleConversationError(res, error, "Server error while submitting rating");
  }
};

exports.createNote = async (req, res) => {
  try {
    const note = await conversationService.createNote(req.params.id, req.user, req.body.note);
    emitSupportUpdate(req, req.params.id, "internal_note_create", { note });
    return res.status(201).json({ success: true, message: "Internal note created", data: { note } });
  } catch (error) {
    return handleConversationError(res, error, "Server error while creating note");
  }
};

exports.getNotes = async (req, res) => {
  try {
    const notes = await conversationService.getNotes(req.params.id, req.user);
    return res.status(200).json({ success: true, data: { notes } });
  } catch (error) {
    return handleConversationError(res, error, "Server error while fetching notes");
  }
};

exports.updateNote = async (req, res) => {
  try {
    const note = await conversationService.updateNote(req.params.noteId, req.user, req.body.note);
    emitSupportUpdate(req, note.conversation, "internal_note_edit", { note });
    return res.status(200).json({ success: true, message: "Internal note updated", data: { note } });
  } catch (error) {
    return handleConversationError(res, error, "Server error while updating note");
  }
};

exports.deleteNote = async (req, res) => {
  try {
    const note = await conversationService.deleteNote(req.params.noteId, req.user);
    emitSupportUpdate(req, note.conversation, "internal_note_delete", { note });
    return res.status(200).json({ success: true, message: "Internal note deleted", data: { note } });
  } catch (error) {
    return handleConversationError(res, error, "Server error while deleting note");
  }
};

exports.getSavedReplies = async (req, res) => {
  try {
    const replies = await conversationService.getSavedReplies(req.user, req.query);
    return res.status(200).json({ success: true, data: { replies } });
  } catch (error) {
    return handleConversationError(res, error, "Server error while fetching saved replies");
  }
};

exports.createSavedReply = async (req, res) => {
  try {
    const reply = await conversationService.createSavedReply(req.user, req.body);
    return res.status(201).json({ success: true, message: "Saved reply created", data: { reply } });
  } catch (error) {
    return handleConversationError(res, error, "Server error while creating saved reply");
  }
};

exports.updateSavedReply = async (req, res) => {
  try {
    const reply = await conversationService.updateSavedReply(req.params.replyId, req.user, req.body);
    return res.status(200).json({ success: true, message: "Saved reply updated", data: { reply } });
  } catch (error) {
    return handleConversationError(res, error, "Server error while updating saved reply");
  }
};

exports.deleteSavedReply = async (req, res) => {
  try {
    const reply = await conversationService.deleteSavedReply(req.params.replyId, req.user);
    return res.status(200).json({ success: true, message: "Saved reply deleted", data: { reply } });
  } catch (error) {
    return handleConversationError(res, error, "Server error while deleting saved reply");
  }
};

exports.useSavedReply = async (req, res) => {
  try {
    const reply = await conversationService.useSavedReply(req.params.replyId, req.user);
    return res.status(200).json({ success: true, data: { reply } });
  } catch (error) {
    return handleConversationError(res, error, "Server error while using saved reply");
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const analytics = await conversationService.getAnalytics(req.user);
    return res.status(200).json({ success: true, data: { analytics } });
  } catch (error) {
    return handleConversationError(res, error, "Server error while fetching live chat analytics");
  }
};

exports.exportConversation = async (req, res) => {
  try {
    const exported = await conversationService.exportConversation(
      req.params.id,
      req.user,
      req.query.format || "txt",
    );

    res.setHeader("Content-Type", exported.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${exported.filename}"`);
    return res.status(200).send(exported.body);
  } catch (error) {
    return handleConversationError(res, error, "Server error while exporting conversation");
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const result = await messageService.createMessage({
      conversationId: req.params.id,
      user: req.user,
      messageType: req.body.messageType || (req.file ? undefined : "text"),
      message: req.body.message,
      file: req.file,
      clientMessageId: req.body.clientMessageId,
    });

    emitMessageEvents(req, result);

    return res.status(result.duplicate ? 200 : 201).json({
      success: true,
      message: result.duplicate ? "Message already exists" : "Message sent",
      data: result,
    });
  } catch (error) {
    return handleConversationError(
      res,
      error,
      "Server error while sending message",
    );
  }
};

exports.adminReply = async (req, res) => {
  try {
    const result = await messageService.adminReply({
      conversationId: req.params.id,
      user: req.user,
      messageType: req.body.messageType || (req.file ? undefined : "text"),
      message: req.body.message,
      file: req.file,
      clientMessageId: req.body.clientMessageId,
    });

    emitMessageEvents(req, result);

    return res.status(result.duplicate ? 200 : 201).json({
      success: true,
      message: result.duplicate ? "Message already exists" : "Admin reply sent",
      data: result,
    });
  } catch (error) {
    return handleConversationError(
      res,
      error,
      "Server error while sending admin reply",
    );
  }
};

exports.getMessages = async (req, res) => {
  try {
    const result = await messageService.getMessages(
      req.params.id,
      req.user,
      req.query,
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleConversationError(
      res,
      error,
      "Server error while fetching messages",
    );
  }
};

exports.uploadAttachment = async (req, res) => {
  try {
    const result = await messageService.uploadAttachmentMessage({
      conversationId: req.params.id,
      user: req.user,
      file: req.file,
      message: req.body.message,
      clientMessageId: req.body.clientMessageId,
    });

    emitMessageEvents(req, result);

    return res.status(result.duplicate ? 200 : 201).json({
      success: true,
      message: result.duplicate
        ? "Attachment message already exists"
        : "Attachment uploaded successfully",
      data: result,
    });
  } catch (error) {
    return handleConversationError(
      res,
      error,
      "Server error while uploading attachment",
    );
  }
};

exports.deleteAttachment = async (req, res) => {
  try {
    const result = await messageService.deleteAttachment(
      req.params.attachmentId,
      req.user,
    );
    const socketServer = req.app.get("socketServer");

    if (socketServer && result.message) {
      socketServer.emitMessageUpdated(result.message.conversation, {
        message: result.message,
        conversation: result.conversation,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Attachment deleted successfully",
      data: result,
    });
  } catch (error) {
    return handleConversationError(
      res,
      error,
      "Server error while deleting attachment",
    );
  }
};

exports.markConversationRead = async (req, res) => {
  try {
    const conversation = await messageService.markConversationRead(
      req.params.id,
      req.user,
    );

    emitConversationUpdate(req, conversation);

    return res.status(200).json({
      success: true,
      message: "Conversation marked as read",
      data: {
        conversation,
      },
    });
  } catch (error) {
    return handleConversationError(
      res,
      error,
      "Server error while marking conversation as read",
    );
  }
};
