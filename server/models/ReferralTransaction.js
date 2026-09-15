const mongoose = require("mongoose");
const { REFERRAL_TRANSACTION_TYPE } = require("../constants/referral");

const referralTransactionSchema = new mongoose.Schema({
  referrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  referredUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  bonus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ReferralBonus",
    default: null,
  },
  turnover: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ReferralTurnover",
    default: null,
  },
  relationship: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ReferralRelationship",
    default: null,
  },
  type: {
    type: String,
    enum: Object.values(REFERRAL_TRANSACTION_TYPE),
    required: true,
  },
  amount: { type: Number, default: 0 },
  description: { type: String, trim: true, default: "" },
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

referralTransactionSchema.pre("save", function () {
  this.updatedAt = Date.now();
});

referralTransactionSchema.index({ referrer: 1, createdAt: -1 });
referralTransactionSchema.index({ referredUser: 1, createdAt: -1 });
referralTransactionSchema.index({ bonus: 1, createdAt: -1 });
referralTransactionSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model(
  "ReferralTransaction",
  referralTransactionSchema,
);
