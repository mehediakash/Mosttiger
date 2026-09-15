const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Conversation",
    required: true,
    index: true,
  },
  senderType: {
    type: String,
    enum: ["user", "admin", "system"],
    required: true,
    index: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
    index: true,
    required: function () {
      return this.senderType !== "system";
    },
  },
  messageType: {
    type: String,
    enum: ["text", "image", "file", "system"],
    required: true,
    index: true,
  },
  message: {
    type: String,
    trim: true,
    default: "",
    maxlength: 5000,
  },
  attachment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Attachment",
    default: null,
  },
  clientMessageId: {
    type: String,
    trim: true,
    default: null,
  },
  readStatus: {
    type: String,
    enum: ["unread", "read"],
    default: "unread",
    index: true,
  },
  deliveryStatus: {
    type: String,
    enum: ["sent", "delivered", "seen"],
    default: "sent",
    index: true,
  },
  deliveredAt: {
    type: Date,
    default: null,
  },
  seenAt: {
    type: Date,
    default: null,
  },
  edited: {
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
  },
  deleted: {
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

messageSchema.pre("save", function () {
  this.updatedAt = Date.now();

  if (this.readStatus === "read" && !this.seenAt) {
    this.seenAt = new Date();
  }

  if (this.deliveryStatus === "seen" && !this.seenAt) {
    this.seenAt = new Date();
    this.readStatus = "read";
  }

  if (
    (this.deliveryStatus === "delivered" || this.deliveryStatus === "seen") &&
    !this.deliveredAt
  ) {
    this.deliveredAt = new Date();
  }
});

messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ conversation: 1, createdAt: 1 });
messageSchema.index({ conversation: 1, readStatus: 1 });
messageSchema.index({ conversation: 1, deliveryStatus: 1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ "deleted.isDeleted": 1, createdAt: -1 });
messageSchema.index(
  { conversation: 1, sender: 1, clientMessageId: 1 },
  {
    unique: true,
    partialFilterExpression: { clientMessageId: { $type: "string" } },
    name: "unique_chat_client_message",
  },
);

module.exports = mongoose.model("Message", messageSchema);
