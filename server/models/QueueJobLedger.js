const mongoose = require("mongoose");

const queueJobLedgerSchema = new mongoose.Schema(
  {
    jobKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    queueName: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["completed", "failed"],
      default: "completed",
      index: true,
    },
    error: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

queueJobLedgerSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 14 });

module.exports = mongoose.model("QueueJobLedger", queueJobLedgerSchema);
