const mongoose = require("mongoose");

const ggrSchema = new mongoose.Schema(
  {
    totalGGR: {
      type: Number,
      default: 0,
    },

    totalPlayerLoss: {
      type: Number,
      default: 0,
    },

    totalPlayerWin: {
      type: Number,
      default: 0,
    },

    totalBets: {
      type: Number,
      default: 0,
    },

    // New Cumulative GGR Accounting Fields
    ggrRate: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },

    appliedGgrRate: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },

    periodBets: {
      type: Number,
      default: 0,
      min: 0,
    },

    periodWins: {
      type: Number,
      default: 0,
      min: 0,
    },

    periodNetGGR: {
      type: Number,
      default: 0,
    },

    periodGGRCharge: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

ggrSchema.index({ updatedAt: -1 });

module.exports = mongoose.model("GGR", ggrSchema);
