const mongoose = require("mongoose");
const { Schema } = mongoose;

const FreeSpinSessionSchema = new Schema(
  {
    // References
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userPromotion: {
      type: Schema.Types.ObjectId,
      ref: "UserPromotion",
      required: true,
    },
    game: {
      type: Schema.Types.ObjectId,
      ref: "Game",
      required: true,
    },

    // Free spin details
    freeSpin: {
      spins: { type: Number, required: true, min: 1 }, // Number of free spins used
      value: { type: Number, required: true, min: 0 }, // Bet amount per spin
      totalBetAmount: { type: Number, required: true, min: 0 }, // spins * value
    },

    // Game result
    winnings: { type: Number, default: 0, min: 0 }, // Winning amount
    status: {
      type: String,
      enum: ["active", "completed", "expired", "cancelled"],
      default: "active",
    },

    // Validation info
    gameBrand: { type: String, required: true },
    gameCategory: { type: String, required: true },

    // Expiry
    expiresAt: { type: Date, required: true },

    // Results
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Indexes
FreeSpinSessionSchema.index({ user: 1 });
FreeSpinSessionSchema.index({ userPromotion: 1 });
FreeSpinSessionSchema.index({ status: 1 });
FreeSpinSessionSchema.index({ user: 1, status: 1 });
FreeSpinSessionSchema.index({ expiresAt: 1 });

module.exports =
  mongoose.models.FreeSpinSession ||
  mongoose.model("FreeSpinSession", FreeSpinSessionSchema);
