const mongoose = require("mongoose");
const {
  AFFILIATE_TRANSACTION_STATUS,
  AFFILIATE_TRANSACTION_TYPE,
} = require("../constants/affiliate");

const affiliateTransactionSchema = new mongoose.Schema({
  affiliate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  type: {
    type: String,
    enum: Object.values(AFFILIATE_TRANSACTION_TYPE),
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  balanceBefore: {
    pendingCommission: { type: Number, default: 0 },
    settledCommission: { type: Number, default: 0 },
    withdrawableBalance: { type: Number, default: 0 },
    lifetimeEarnings: { type: Number, default: 0 },
    lifetimeWithdraw: { type: Number, default: 0 },
  },
  balanceAfter: {
    pendingCommission: { type: Number, default: 0 },
    settledCommission: { type: Number, default: 0 },
    withdrawableBalance: { type: Number, default: 0 },
    lifetimeEarnings: { type: Number, default: 0 },
    lifetimeWithdraw: { type: Number, default: 0 },
  },
  status: {
    type: String,
    enum: Object.values(AFFILIATE_TRANSACTION_STATUS),
    default: AFFILIATE_TRANSACTION_STATUS.COMPLETED,
  },
  referenceId: {
    type: String,
    unique: true,
    sparse: true,
  },
  commission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AffiliateCommission",
    default: null,
  },
  settlement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AffiliateSettlement",
    default: null,
  },
  withdrawal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AffiliateWithdrawal",
    default: null,
  },
  description: {
    type: String,
    trim: true,
    default: "",
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

affiliateTransactionSchema.pre("save", function () {
  if (this.isNew && !this.referenceId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    this.referenceId = `AFT${timestamp}${random}`.toUpperCase();
  }

  this.updatedAt = Date.now();
});

affiliateTransactionSchema.index({ affiliate: 1, createdAt: -1 });
affiliateTransactionSchema.index({ type: 1, status: 1, createdAt: -1 });
affiliateTransactionSchema.index({ commission: 1 });
affiliateTransactionSchema.index({ settlement: 1 });
affiliateTransactionSchema.index({ withdrawal: 1 });

module.exports = mongoose.model(
  "AffiliateTransaction",
  affiliateTransactionSchema,
);
