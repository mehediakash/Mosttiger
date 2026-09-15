const mongoose = require("mongoose");

const promoCodeUsageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  promoCode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PromoCode",
    required: true,
  },
  bonusAmount: {
    type: Number,
    required: true,
  },
  walletType: {
    type: String,
    required: true,
    enum: ["main", "bonus", "freeBets"],
  },
  depositAmount: {
    type: Number,
    default: 0,
  },
  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Transaction",
    default: null,
  },
  status: {
    type: String,
    required: true,
    enum: ["active", "used", "expired", "cancelled"],
    default: "active",
  },
  turnoverProgress: {
    type: Number,
    default: 0,
  },
  usedAt: {
    type: Date,
    default: null,
  },
  expiresAt: {
    type: Date,
    default: null,
  },
  referenceId: {
    type: String,
    unique: true,
    sparse: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
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

promoCodeUsageSchema.pre("save", async function () {
  this.updatedAt = Date.now();

  if (this.isNew && !this.referenceId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    this.referenceId = `PROMO${timestamp}${random}`.toUpperCase();
  }
});

// Indexes for performance
promoCodeUsageSchema.index({ user: 1, promoCode: 1 });
promoCodeUsageSchema.index({ status: 1 });
promoCodeUsageSchema.index({ createdAt: -1 });

module.exports = mongoose.model("PromoCodeUsage", promoCodeUsageSchema);
