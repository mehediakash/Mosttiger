const mongoose = require("mongoose");
const { REFERRAL_RELATIONSHIP_STATUS } = require("../constants/referral");

const referralRelationshipSchema = new mongoose.Schema({
  referrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  referredUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  referralCode: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
  },
  registeredAt: {
    type: Date,
    default: Date.now,
  },
  firstDeposit: {
    deposit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Deposit",
      default: null,
    },
    amount: { type: Number, default: 0, min: 0 },
    depositedAt: { type: Date, default: null },
  },
  requiredTurnover: { type: Number, default: 0, min: 0 },
  turnoverCompleted: { type: Number, default: 0, min: 0 },
  qualifiedAt: { type: Date, default: null },
  bonusCreatedAt: { type: Date, default: null },
  status: {
    type: String,
    enum: Object.values(REFERRAL_RELATIONSHIP_STATUS),
    default: REFERRAL_RELATIONSHIP_STATUS.WAITING_DEPOSIT,
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

referralRelationshipSchema.pre("save", function () {
  this.updatedAt = Date.now();
});

referralRelationshipSchema.index({ referrer: 1, createdAt: -1 });
referralRelationshipSchema.index({ referrer: 1, status: 1 });
referralRelationshipSchema.index({ referralCode: 1, createdAt: -1 });

module.exports = mongoose.model(
  "ReferralRelationship",
  referralRelationshipSchema,
);
