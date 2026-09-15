const mongoose = require("mongoose");

const chatSavedReplySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
    index: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000,
  },
  category: {
    type: String,
    trim: true,
    default: "general",
    index: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  usageCount: {
    type: Number,
    default: 0,
    min: 0,
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

chatSavedReplySchema.pre("save", function () {
  this.updatedAt = Date.now();
});

chatSavedReplySchema.index({ title: "text", message: "text", category: "text" });
chatSavedReplySchema.index({ isActive: 1, updatedAt: -1 });

module.exports = mongoose.model("ChatSavedReply", chatSavedReplySchema);
