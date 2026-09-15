const mongoose = require("mongoose");

const chatInternalNoteSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Conversation",
    required: true,
    index: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  note: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000,
  },
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

chatInternalNoteSchema.pre("save", function () {
  this.updatedAt = Date.now();
});

chatInternalNoteSchema.index({ conversation: 1, createdAt: -1 });
chatInternalNoteSchema.index({ author: 1, createdAt: -1 });

module.exports = mongoose.model("ChatInternalNote", chatInternalNoteSchema);
