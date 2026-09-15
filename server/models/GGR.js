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
  },
  {
    timestamps: true,
  },
);

ggrSchema.index({ updatedAt: -1 });

module.exports = mongoose.model("GGR", ggrSchema);
