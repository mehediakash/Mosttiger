const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema({
  message: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message",
    required: true,
    unique: true,
    index: true,
  },
  cloudinaryUrl: {
    type: String,
    required: true,
    trim: true,
  },
  cloudinaryPublicId: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  originalName: {
    type: String,
    required: true,
    trim: true,
  },
  mimeType: {
    type: String,
    required: true,
    enum: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  },
  fileSize: {
    type: Number,
    required: true,
    min: 1,
    max: 2 * 1024 * 1024,
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

attachmentSchema.pre("save", function () {
  this.updatedAt = Date.now();
});

attachmentSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Attachment", attachmentSchema);
