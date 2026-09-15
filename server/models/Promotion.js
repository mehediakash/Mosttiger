const mongoose = require("mongoose");
const { Schema } = mongoose;

const BONUS_TYPES = [
  "deposit_bonus",
  "free_spin",
  "cashback",
  "rescue_bonus",
  "sports_bonus",
  "welcome_bonus",
];

const CATEGORIES = [
  "ALL",
  "Sports",
  "Casino",
  "Slots",
  "Fishing",
  "Lottery",
  "Arcade",
  "Crash",
];

const BonusConfigSchema = new Schema(
  {
    minDeposit: { type: Number, default: 0, min: 0 },
    maxDeposit: { type: Number, default: null, min: 0 },
    bonusPercent: { type: Number, default: 0, min: 0 },
    fixedBonusAmount: { type: Number, default: 0, min: 0 },
    maxBonus: { type: Number, default: null, min: 0 },
    turnoverMultiplier: { type: Number, default: 0, min: 0 },
    maxWithdraw: { type: Number, default: null, min: 0 },
  },
  { _id: false },
);

const FreeSpinConfigSchema = new Schema(
  {
    freeSpinCount: { type: Number, default: 0, min: 0 },
    freeSpinValue: { type: Number, default: 0, min: 0 },
    // reference to a provider (if you have a Provider model), otherwise store string
    freeSpinProvider: {
      type: String,
      default: null,
    },
  },
  { _id: false },
);

const PromotionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    shortDescription: { type: String, trim: true, default: "" },
    fullDescription: { type: String, trim: true, default: "" },
    imageUrl: { type: String, trim: true, default: "" },
    cloudinaryPublicId: { type: String, trim: true, default: "" },

    // Promo code (optional) - uppercased for consistency
    promoCode: { type: String, trim: true, uppercase: true, sparse: true },

    type: { type: String, enum: BONUS_TYPES, required: true },

    // Targeting
    allowedCategories: [{ type: String, enum: CATEGORIES, default: "ALL" }],
    allowedProviders: [{ type: String }],
    excludedProviders: [{ type: String }],
    allowedGames: [{ type: Schema.Types.ObjectId, ref: "Game" }],
    newUserOnly: { type: Boolean, default: false },
    firstDepositOnly: { type: Boolean, default: false },
    maxUsagePerUser: { type: Number, default: 1, min: 1 },

    // Bonus configuration
    bonusConfig: { type: BonusConfigSchema, default: () => ({}) },

    // Free spin configuration
    freeSpinConfig: { type: FreeSpinConfigSchema, default: () => ({}) },

    // Expiry
    isLifetime: { type: Boolean, default: false },
    expiresAt: { type: Date, default: null },

    // Status
    status: { type: String, enum: ["active", "inactive"], default: "inactive" },
  },
  { timestamps: true },
);

// Indexes
PromotionSchema.index({ type: 1 });
PromotionSchema.index({ allowedCategories: 1 });
PromotionSchema.index({ status: 1, expiresAt: 1 });
PromotionSchema.index({
  title: "text",
  shortDescription: "text",
  fullDescription: "text",
});

// Virtual to quickly check expiry
PromotionSchema.virtual("isExpired").get(function () {
  if (this.isLifetime) return false;
  if (!this.expiresAt) return false;
  return this.expiresAt.getTime() < Date.now();
});

PromotionSchema.set("toJSON", { virtuals: true });
PromotionSchema.set("toObject", { virtuals: true });

module.exports =
  mongoose.models.Promotion || mongoose.model("Promotion", PromotionSchema);
