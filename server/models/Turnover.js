const mongoose = require("mongoose");

const TurnoverSchema = new mongoose.Schema(
  {
    // User Reference
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Hierarchy References
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agent",
      sparse: true,
      index: true,
    },
    superAgentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agent",
      sparse: true,
      index: true,
    },
    masterAgentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agent",
      sparse: true,
      index: true,
    },

    // Bet Reference
    betId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GameSession",
      required: true,
    },

    // Turnover Amount (total wagered - NOT profit/loss)
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Game Type
    gameType: {
      type: String,
    },

    // Status of the bet
    betStatus: {
      type: String,
      enum: ["pending", "won", "lost", "cancelled"],
      default: "pending",
      index: true,
    },

    // Platform Turnover Aggregation (denormalized for performance)
    // Updated daily for quick platform-level queries
    platformTurnoverDate: {
      type: Date,
    },

    // Metadata
    description: {
      type: String,
      default: "User wagering amount",
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for optimized queries
TurnoverSchema.index({ userId: 1, createdAt: -1 });
TurnoverSchema.index({ agentId: 1, createdAt: -1 });
TurnoverSchema.index({ superAgentId: 1, createdAt: -1 });
TurnoverSchema.index({ masterAgentId: 1, createdAt: -1 });
TurnoverSchema.index({ createdAt: -1 });
TurnoverSchema.index({ platformTurnoverDate: 1 });
TurnoverSchema.index({ userId: 1, betStatus: 1 });

// Prevent duplicate turnover entries
TurnoverSchema.index({ betId: 1 }, { unique: true });

module.exports = mongoose.model("Turnover", TurnoverSchema);
