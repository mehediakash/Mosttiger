const mongoose = require("mongoose");

const nineWicketTransferSchema = new mongoose.Schema(
  {
    transferId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NineWicketSession",
      default: null,
      index: true,
    },
    sessionId: {
      type: String,
      default: null,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    memberAccount: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ["launch_credit", "inquiry", "cashout_debit", "callback_transfer"],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    beforeAmount: {
      type: Number,
      default: null,
    },
    afterAmount: {
      type: Number,
      default: null,
    },
    transferAmount: {
      type: Number,
      default: null,
    },
    currency: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "duplicate"],
      default: "pending",
      index: true,
    },
    walletTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },
    providerCode: {
      type: Number,
      default: null,
    },
    providerMsg: {
      type: String,
      default: "",
    },
    requestPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    providerResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

nineWicketTransferSchema.index({ user: 1, createdAt: -1 });
nineWicketTransferSchema.index({ sessionId: 1, action: 1 });

module.exports = mongoose.model("NineWicketTransfer", nineWicketTransferSchema);
