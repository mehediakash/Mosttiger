const mongoose = require("mongoose");
const { Schema } = mongoose;

const TURNOVER_STATUSES = [
  "pending",
  "active",
  "completed",
  "expired",
  "cancelled",
];

const PromotionTurnoverSchema = new Schema(
  {
    // References
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    promotion: {
      type: Schema.Types.ObjectId,
      ref: "Promotion",
      required: true,
    },

    // Amounts
    depositAmount: { type: Number, required: true, min: 0 },
    bonusAmount: { type: Number, required: true, min: 0 },

    // Turnover tracking
    turnoverRequired: { type: Number, required: true, min: 0 },
    turnoverCompleted: { type: Number, default: 0, min: 0 },
    turnoverPercentage: { type: Number, default: 0, min: 0, max: 100 },

    // Restrictions
    allowedCategories: [{ type: String, default: "ALL" }],
    allowedProviders: [{ type: String }],

    // Status tracking
    withdrawLocked: { type: Boolean, default: true },
    status: {
      type: String,
      enum: TURNOVER_STATUSES,
      default: "active",
    },

    // Expiry
    expiresAt: { type: Date, required: true },
    completedAt: { type: Date, default: null },
    // Claimable flag - user must claim bonus manually
    claimed: { type: Boolean, default: false },
    claimedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Indexes
PromotionTurnoverSchema.index({ user: 1 });
PromotionTurnoverSchema.index({ promotion: 1 });
PromotionTurnoverSchema.index({ user: 1, promotion: 1 });
PromotionTurnoverSchema.index({ status: 1 });
PromotionTurnoverSchema.index({ status: 1, expiresAt: 1 });
PromotionTurnoverSchema.index({ expiresAt: 1 });
PromotionTurnoverSchema.index({ withdrawLocked: 1 });
PromotionTurnoverSchema.index({ createdAt: 1 });

// Virtual to check if turnover is complete
PromotionTurnoverSchema.virtual("isComplete").get(function () {
  return this.turnoverCompleted >= this.turnoverRequired;
});

// Virtual to check if expired
PromotionTurnoverSchema.virtual("isExpired").get(function () {
  return this.expiresAt.getTime() < Date.now();
});

// Virtual for remaining turnover
PromotionTurnoverSchema.virtual("remainingTurnover").get(function () {
  return Math.max(0, this.turnoverRequired - this.turnoverCompleted);
});

PromotionTurnoverSchema.set("toJSON", { virtuals: true });
PromotionTurnoverSchema.set("toObject", { virtuals: true });

module.exports =
  mongoose.models.PromotionTurnover ||
  mongoose.model("PromotionTurnover", PromotionTurnoverSchema);
