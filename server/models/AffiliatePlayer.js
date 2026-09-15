const mongoose = require("mongoose");

const affiliatePlayerSchema = new mongoose.Schema({
  affiliate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  affiliateCode: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
  },
  registeredAt: {
    type: Date,
    default: Date.now,
  },
  firstDepositAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  firstDepositAt: {
    type: Date,
    default: null,
  },
  totalDeposit: {
    type: Number,
    default: 0,
    min: 0,
  },
  turnover: {
    type: Number,
    default: 0,
    min: 0,
  },
  netLoss: {
    type: Number,
    default: 0,
  },
  commissionGenerated: {
    type: Number,
    default: 0,
    min: 0,
  },
  qualified: {
    type: Boolean,
    default: false,
  },
  qualifiedAt: {
    type: Date,
    default: null,
  },
  lastCalculatedAt: {
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

affiliatePlayerSchema.pre("save", function () {
  this.updatedAt = Date.now();
});

affiliatePlayerSchema.index({ affiliate: 1, registeredAt: -1 });
affiliatePlayerSchema.index({ affiliate: 1, qualified: 1 });
affiliatePlayerSchema.index({ affiliateCode: 1 });

module.exports = mongoose.model("AffiliatePlayer", affiliatePlayerSchema);
