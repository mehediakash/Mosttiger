const mongoose = require("mongoose");
const { REFERRAL_BONUS_STATUS } = require("../constants/referral");

const referralBonusSchema = new mongoose.Schema({
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
  relationship: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ReferralRelationship",
    required: true,
    unique: true,
  },
  referralCode: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
  },
  firstDepositAmount: { type: Number, default: 0, min: 0 },
  requiredTurnover: { type: Number, default: 0, min: 0 },
  turnoverCompleted: { type: Number, default: 0, min: 0 },
  bonusAmount: { type: Number, default: 0, min: 0 },
  status: {
    type: String,
    enum: Object.values(REFERRAL_BONUS_STATUS),
    default: REFERRAL_BONUS_STATUS.PENDING_CLAIM,
  },
  qualifiedAt: { type: Date, default: null },
  claimedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
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

referralBonusSchema.pre("save", function () {
  this.updatedAt = Date.now();
});

referralBonusSchema.index({ referrer: 1, status: 1, createdAt: -1 });
referralBonusSchema.index({ referredUser: 1, createdAt: -1 });
referralBonusSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("ReferralBonus", referralBonusSchema);
