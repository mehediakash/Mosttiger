const mongoose = require("mongoose");
const {
  AFFILIATE_APPLICATION_STATUS,
  AFFILIATE_PAYMENT_METHOD,
} = require("../constants/affiliate");

const affiliateApplicationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  basicInfo: {
    fullName: { type: String, trim: true, default: "" },
    username: { type: String, trim: true, lowercase: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "" },
  },
  payment: {
    preferredPaymentMethod: {
      type: String,
      enum: Object.values(AFFILIATE_PAYMENT_METHOD),
      required: true,
    },
    paymentNumber: {
      type: String,
      trim: true,
      required: true,
    },
    bankName: {
      type: String,
      trim: true,
      default: "",
    },
    accountName: {
      type: String,
      trim: true,
      default: "",
    },
    accountNumber: {
      type: String,
      trim: true,
      default: "",
    },
    branchName: {
      type: String,
      trim: true,
      default: "",
    },
  },
  marketing: {
    promotionMethod: { type: String, trim: true, default: "" },
    trafficSource: { type: String, trim: true, default: "" },
    estimatedMonthlyPlayers: { type: Number, default: 0, min: 0 },
    previousExperience: { type: String, trim: true, default: "" },
    previousBettingSite: { type: String, trim: true, default: "" },
  },
  socialLinks: {
    facebook: { type: String, trim: true, default: "" },
    telegram: { type: String, trim: true, default: "" },
    website: { type: String, trim: true, default: "" },
    youtube: { type: String, trim: true, default: "" },
  },
  status: {
    type: String,
    enum: Object.values(AFFILIATE_APPLICATION_STATUS),
    default: AFFILIATE_APPLICATION_STATUS.PENDING,
    index: true,
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  reviewedAt: {
    type: Date,
    default: null,
  },
  rejectionReason: {
    type: String,
    trim: true,
    default: null,
  },
  adminNote: {
    type: String,
    trim: true,
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

affiliateApplicationSchema.pre("save", function () {
  this.updatedAt = Date.now();
});

affiliateApplicationSchema.index({ user: 1 }, { unique: true });
affiliateApplicationSchema.index({ user: 1, createdAt: -1 });
affiliateApplicationSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model(
  "AffiliateApplication",
  affiliateApplicationSchema,
);
