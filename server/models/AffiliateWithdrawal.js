const mongoose = require("mongoose");
const {
  AFFILIATE_PAYMENT_METHOD,
  AFFILIATE_WITHDRAW_APPROVAL,
  AFFILIATE_WITHDRAWAL_STATUS,
} = require("../constants/affiliate");

const affiliateWithdrawalSchema = new mongoose.Schema({
  affiliate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  settlement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AffiliateSettlement",
    default: null,
  },
  amount: {
    type: Number,
    required: true,
    min: 1,
  },
  netAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  processingFee: {
    type: Number,
    default: 0,
    min: 0,
  },
  paymentMethod: {
    type: String,
    enum: Object.values(AFFILIATE_PAYMENT_METHOD),
    required: true,
  },
  paymentDetails: {
    toNumber: {
      type: String,
      trim: true,
      default: "",
    },
    accountName: {
      type: String,
      trim: true,
      default: "",
    },
    bankName: {
      type: String,
      trim: true,
      default: "",
    },
    branchName: {
      type: String,
      trim: true,
      default: "",
    },
    accountNumber: {
      type: String,
      trim: true,
      default: "",
    },
  },
  approvalMode: {
    type: String,
    enum: Object.values(AFFILIATE_WITHDRAW_APPROVAL),
    default: AFFILIATE_WITHDRAW_APPROVAL.MANUAL,
  },
  status: {
    type: String,
    enum: Object.values(AFFILIATE_WITHDRAWAL_STATUS),
    default: AFFILIATE_WITHDRAWAL_STATUS.PENDING,
  },
  referenceId: {
    type: String,
    unique: true,
    sparse: true,
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
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  processedAt: {
    type: Date,
    default: null,
  },
  transactionId: {
    type: String,
    trim: true,
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

affiliateWithdrawalSchema.pre("save", function () {
  if (this.isNew && !this.referenceId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    this.referenceId = `AFW${timestamp}${random}`.toUpperCase();
  }

  this.updatedAt = Date.now();
});

affiliateWithdrawalSchema.index({ affiliate: 1, createdAt: -1 });
affiliateWithdrawalSchema.index({ settlement: 1 });
affiliateWithdrawalSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model(
  "AffiliateWithdrawal",
  affiliateWithdrawalSchema,
);
