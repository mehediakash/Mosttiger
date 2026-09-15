const mongoose = require("mongoose");

const gameConfigSchema = new mongoose.Schema({
  game: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Game",
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  minBet: {
    type: Number,
    default: 0,
  },
  maxBet: {
    type: Number,
    default: 10000,
  },
  rtp: {
    type: Number,
    default: 95,
    min: 0,
    max: 100,
  },
  commission: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  maintenanceMode: {
    type: Boolean,
    default: false,
  },
  featured: {
    type: Boolean,
    default: false,
  },
  isHot: {
    type: Boolean,
    default: false,
  },
  category: {
    type: String,
    required: true,
  },
  provider: {
    type: String,
    required: true,
  },
  config: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
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

gameConfigSchema.pre("save", async function () {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model("GameConfig", gameConfigSchema);
