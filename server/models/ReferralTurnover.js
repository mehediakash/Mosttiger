const mongoose = require("mongoose");
const { REFERRAL_TURNOVER_STATUS } = require("../constants/referral");

const referralTurnoverSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  referrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  referredUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  bonus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ReferralBonus",
    required: true,
    unique: true,
  },
  relationship: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ReferralRelationship",
    required: true,
  },
  bonusAmount: { type: Number, required: true, min: 0 },
  turnoverRequired: { type: Number, required: true, min: 0 },
  turnoverCompleted: { type: Number, default: 0, min: 0 },
  turnoverRemaining: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: Object.values(REFERRAL_TURNOVER_STATUS),
    default: REFERRAL_TURNOVER_STATUS.ACTIVE,
  },
  withdrawLocked: { type: Boolean, default: true },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
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

referralTurnoverSchema.pre("save", function () {
  this.turnoverRemaining = Math.max(
    0,
    Number(this.turnoverRequired || 0) - Number(this.turnoverCompleted || 0),
  );
  this.updatedAt = Date.now();
});

referralTurnoverSchema.index({ user: 1, status: 1, createdAt: -1 });
referralTurnoverSchema.index({ referrer: 1, createdAt: -1 });
referralTurnoverSchema.index({ referredUser: 1, createdAt: -1 });
referralTurnoverSchema.index({ withdrawLocked: 1, status: 1 });

module.exports = mongoose.model("ReferralTurnover", referralTurnoverSchema);
