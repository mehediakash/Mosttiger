const mongoose = require("mongoose");

const gameSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  memberAccount: {
    type: String,
    default: null,
    index: true,
  },
  game: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Game",
    required: true,
  },
  gameUid: {
    type: String,
    required: true,
    unique: true,
  },
  providerSessionId: {
    // ← THIS IS THE REAL ONE FROM PROVIDER (CRITICAL!)
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function (v) {
        // Prevent "unknown" from being used as it causes duplicate key errors
        return v !== "unknown";
      },
      message: 'providerSessionId cannot be "unknown"',
    },
  },
  providerGameCode: {
    // ← THIS IS THE GAME CODE (1373, 2780, 2657)
    type: String,
    required: true,
    index: true,
  },
  gameRound: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    required: true,
    enum: ["active", "completed", "cancelled", "failed", "closed"],
    default: "active",
  },
  betAmount: {
    type: Number,
    default: 0,
  },
  winAmount: {
    type: Number,
    default: 0,
  },
  netResult: {
    type: Number,
    default: 0,
  },
  startBalance: {
    type: Number,
    required: true,
  },
  endBalance: {
    type: Number,
    default: null,
  },
  currency: {
    type: String,
    default: "BDT",
  },
  language: {
    type: String,
    default: "en",
  },
  launchUrl: {
    type: String,
    default: null,
  },
  returnUrl: {
    type: String,
    required: true,
  },
  callbackUrl: {
    type: String,
    required: true,
  },
  providerData: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  endedAt: {
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

gameSessionSchema.pre("save", async function () {
  this.updatedAt = Date.now();

  // Generate game UID if not provided
  if (this.isNew && !this.gameUid) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    this.gameUid = `GS${timestamp}${random}`.toUpperCase();
  }

  // Calculate net result
  if (this.betAmount !== undefined && this.winAmount !== undefined) {
    this.netResult = this.winAmount - this.betAmount;
  }
});

// Indexes for performance

// TTL cleanup: keep only the last 7 days of game sessions
gameSessionSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 7 },
);

gameSessionSchema.index({ gameRound: 1 });

gameSessionSchema.index({
  user: 1,
  providerGameCode: 1,
  status: 1,
});

gameSessionSchema.index({
  providerGameCode: 1,
  memberAccount: 1,
  status: 1,
  createdAt: -1,
});

module.exports = mongoose.model("GameSession", gameSessionSchema);
