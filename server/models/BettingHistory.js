const mongoose = require("mongoose");

const bettingHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    gameSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GameSession",
      required: true,
    },
    game: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Game",
    },
    provider: {
      type: String,
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    gameName: {
      type: String,
      required: true,
    },
    providerGameCode: {
      type: String,
    },
    gameRound: {
      type: String,
      index: true,
    },
    status: {
      type: String,
      enum: ["settled", "unsettled"],
      default: "settled",
      index: true,
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
    turnoverAmount: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: "BDT",
    },
    isFreeSpin: {
      type: Boolean,
      default: false,
    },
    isBonusBet: {
      type: Boolean,
      default: false,
    },
    startBalance: {
      type: Number,
      default: 0,
    },
    endBalance: {
      type: Number,
      default: 0,
    },
    playedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    settledAt: {
      type: Date,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

// Compound indexes for optimal querying
bettingHistorySchema.index({
  user: 1,
  createdAt: -1,
});

// TTL cleanup: keep only the last 7 days of betting history
bettingHistorySchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 7 },
);

bettingHistorySchema.index({
  user: 1,
  status: 1,
});

bettingHistorySchema.index({
  provider: 1,
  createdAt: -1,
});

// Duplicate callback fallback protection. Matches the existing duplicate check.
bettingHistorySchema.index(
  {
    user: 1,
    gameRound: 1,
    betAmount: 1,
    winAmount: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      gameRound: { $type: "string" },
    },
  },
);

module.exports = mongoose.model("BettingHistory", bettingHistorySchema);
