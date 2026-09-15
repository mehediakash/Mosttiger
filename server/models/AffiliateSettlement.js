const mongoose = require("mongoose");
const { AFFILIATE_SETTLEMENT_STATUS } = require("../constants/affiliate");

const affiliateSettlementSchema = new mongoose.Schema({
  affiliate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  periodStart: {
    type: Date,
    required: true,
  },
  periodEnd: {
    type: Date,
    required: true,
  },
  totals: {
    grossRevenue: { type: Number, default: 0 },
    adjustments: { type: Number, default: 0 },
    negativeCarryIn: { type: Number, default: 0 },
    negativeCarryApplied: { type: Number, default: 0, min: 0 },
    negativeCarryOut: { type: Number, default: 0, min: 0 },
    netRevenue: { type: Number, default: 0 },
    commissionAmount: { type: Number, default: 0, min: 0 },
    withdrawnAmount: { type: Number, default: 0, min: 0 },
  },
  commissionCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  status: {
    type: String,
    enum: Object.values(AFFILIATE_SETTLEMENT_STATUS),
    default: AFFILIATE_SETTLEMENT_STATUS.DRAFT,
  },
  referenceId: {
    type: String,
    unique: true,
    sparse: true,
  },
  configSnapshot: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  approvedAt: {
    type: Date,
    default: null,
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  rejectedAt: {
    type: Date,
    default: null,
  },
  rejectionReason: {
    type: String,
    trim: true,
    default: null,
  },
  paidAt: {
    type: Date,
    default: null,
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

affiliateSettlementSchema.pre("save", function () {
  if (this.isNew && !this.referenceId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    this.referenceId = `AFS${timestamp}${random}`.toUpperCase();
  }

  this.updatedAt = Date.now();
});

affiliateSettlementSchema.index(
  { affiliate: 1, periodStart: 1, periodEnd: 1 },
  { unique: true },
);
affiliateSettlementSchema.index({ affiliate: 1, status: 1, createdAt: -1 });
affiliateSettlementSchema.index({ status: 1, periodEnd: -1 });

module.exports = mongoose.model(
  "AffiliateSettlement",
  affiliateSettlementSchema,
);
