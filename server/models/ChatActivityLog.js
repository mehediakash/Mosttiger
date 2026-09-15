const mongoose = require("mongoose");

const chatActivityLogSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Conversation",
    default: null,
    index: true,
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  action: {
    type: String,
    required: true,
    enum: [
      "assignment",
      "reply",
      "close",
      "reopen",
      "archive",
      "restore",
      "resolve",
      "status_change",
      "priority_change",
      "tag_update",
      "conversation_export",
      "internal_note_create",
      "internal_note_edit",
      "internal_note_delete",
      "chat_restriction_update",
      "saved_reply_create",
      "saved_reply_edit",
      "saved_reply_delete",
    ],
    index: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

chatActivityLogSchema.index({ conversation: 1, createdAt: -1 });
chatActivityLogSchema.index({ admin: 1, createdAt: -1 });
chatActivityLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model("ChatActivityLog", chatActivityLogSchema);
