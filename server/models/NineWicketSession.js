const mongoose = require("mongoose");

const nineWicketSessionSchema = new mongoose.Schema(
  {
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
    gameUid: {
      type: String,
      required: true,
      index: true,
    },
    symbol: {
      type: String,
      default: "9W",
      index: true,
    },
    sessionId: {
      type: String,
      default: null,
      index: true,
    },
    launchTransferId: {
      type: String,
      required: true,
      unique: true,
    },
    currency: {
      type: String,
      required: true,
      default: "BDT",
    },
    language: {
      type: String,
      default: "en",
    },
    initialAmount: {
      type: Number,
      required: true,
      min: 0,
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
    status: {
      type: String,
      enum: [
        "launching",
        "active",
        "launch_failed",
        "ending",
        "cashout_pending",
        "completed",
        "reconciliation_required",
        "cancelled",
      ],
      default: "launching",
      index: true,
    },
    cashoutStatus: {
      type: String,
      enum: [
        "not_started",
        "processing",
        "inquiry_done",
        "debited",
        "failed",
        "none",
      ],
      default: "not_started",
    },
    cashoutTransferId: {
      type: String,
      default: null,
      index: true,
    },
    settlementStartedAt: {
      type: Date,
      default: null,
    },
    settlementError: {
      type: String,
      default: null,
    },
    walletDebitTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },
    walletCreditTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },
    launchResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    providerMetadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    callbackEvents: [
      {
        eventType: String,
        transferId: String,
        sessionId: String,
        beforeAmount: Number,
        afterAmount: Number,
        transferAmount: Number,
        receivedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    endedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

nineWicketSessionSchema.index({ user: 1, status: 1, createdAt: -1 });
nineWicketSessionSchema.index({ sessionId: 1, status: 1 });

module.exports = mongoose.model("NineWicketSession", nineWicketSessionSchema);
