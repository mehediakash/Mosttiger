const mongoose = require("mongoose");
const { AFFILIATE_COMMISSION_STATUS } = require("../constants/affiliate");

const affiliateCommissionSchema = new mongoose.Schema({
  affiliate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  settlement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AffiliateSettlement",
    default: null,
  },
  periodStart: {
    type: Date,
    required: true,
  },
  periodEnd: {
    type: Date,
    required: true,
  },
  grossRevenue: {
    type: Number,
    default: 0,
  },
  adjustments: {
    type: Number,
    default: 0,
  },
  negativeCarryApplied: {
    type: Number,
    default: 0,
    min: 0,
  },
  netRevenue: {
    type: Number,
    default: 0,
  },
  revenueSharePercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    default: "BDT",
  },
  status: {
    type: String,
    enum: Object.values(AFFILIATE_COMMISSION_STATUS),
    default: AFFILIATE_COMMISSION_STATUS.PENDING,
  },
  referenceId: {
    type: String,
    unique: true,
    sparse: true,
  },
  source: {
    gameSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GameSession",
      default: null,
    },
    sportsBet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SportsBet",
      default: null,
    },
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },
  },
  configSnapshot: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  calculatedAt: {
    type: Date,
    default: Date.now,
  },
  approvedAt: {
    type: Date,
    default: null,
  },
  paidAt: {
    type: Date,
    default: null,
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

affiliateCommissionSchema.pre("save", function () {
  if (this.isNew && !this.referenceId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    this.referenceId = `AFC${timestamp}${random}`.toUpperCase();
  }

  this.updatedAt = Date.now();
});

affiliateCommissionSchema.index({ affiliate: 1, createdAt: -1 });
affiliateCommissionSchema.index({ player: 1, createdAt: -1 });
affiliateCommissionSchema.index({ settlement: 1 });
affiliateCommissionSchema.index({ status: 1, calculatedAt: -1 });
affiliateCommissionSchema.index({ affiliate: 1, status: 1, periodStart: 1 });
affiliateCommissionSchema.index(
  { affiliate: 1, player: 1, periodStart: 1, periodEnd: 1 },
  { unique: true },
);

module.exports = mongoose.model(
  "AffiliateCommission",
  affiliateCommissionSchema,
);
