const mongoose = require("mongoose");
const { Schema } = mongoose;

const USER_PROMO_STATUSES = ["active", "completed", "expired", "cancelled"];

const UserPromotionSchema = new Schema(
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

    // Free spin tracking
    remainingFreeSpins: { type: Number, default: 0, min: 0 },
    freeSpinValue: { type: Number, default: 0, min: 0 },
    freeSpinProvider: { type: String, default: null },

    // Bonus balance
    bonusBalance: { type: Number, default: 0, min: 0 },

    // Restrictions
    allowedProviders: [{ type: String }],
    allowedCategories: [{ type: String, default: "ALL" }],

    // Status
    status: {
      type: String,
      enum: USER_PROMO_STATUSES,
      default: "active",
    },

    // Expiry
    expiresAt: { type: Date, required: true },
    // Claim state (for bonus/free-spin conversion)
    claimed: { type: Boolean, default: false },
    claimedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Indexes
UserPromotionSchema.index({ user: 1 });
UserPromotionSchema.index({ promotion: 1 });
UserPromotionSchema.index({ user: 1, promotion: 1 });
UserPromotionSchema.index({ status: 1 });
UserPromotionSchema.index({ user: 1, status: 1 });
UserPromotionSchema.index({ status: 1, expiresAt: 1 });
UserPromotionSchema.index({ expiresAt: 1 });
UserPromotionSchema.index({ bonusBalance: 1 });
UserPromotionSchema.index({ remainingFreeSpins: 1 });

// Virtual to check if expired
UserPromotionSchema.virtual("isExpired").get(function () {
  return this.expiresAt.getTime() < Date.now();
});

// Virtual to check if has free spins
UserPromotionSchema.virtual("hasFreeSpin").get(function () {
  return this.remainingFreeSpins > 0;
});

// Virtual to check if has bonus balance
UserPromotionSchema.virtual("hasBonus").get(function () {
  return this.bonusBalance > 0;
});

UserPromotionSchema.set("toJSON", { virtuals: true });
UserPromotionSchema.set("toObject", { virtuals: true });

module.exports =
  mongoose.models.UserPromotion ||
  mongoose.model("UserPromotion", UserPromotionSchema);
