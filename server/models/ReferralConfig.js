const mongoose = require("mongoose");
const { REFERRAL_CONFIG } = require("../constants/referral");

const referralConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "default",
      unique: true,
      immutable: true,
    },
    bonusAmount: {
      type: Number,
      default: REFERRAL_CONFIG.bonusAmount,
      min: 0,
    },
    minimumFirstDeposit: {
      type: Number,
      default: REFERRAL_CONFIG.minimumFirstDeposit,
      min: 0,
    },
    requiredTurnoverMultiplier: {
      type: Number,
      default: REFERRAL_CONFIG.turnoverMultiplier,
      min: 0,
    },
    bonusClaimExpiryDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    maximumReferralBonusPerUser: {
      type: Number,
      default: 0,
      min: 0,
    },
    maximumReferralCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ReferralConfig", referralConfigSchema);
