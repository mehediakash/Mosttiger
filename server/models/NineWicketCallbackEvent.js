const mongoose = require("mongoose");

const nineWicketCallbackEventSchema = new mongoose.Schema(
  {
    eventKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: ["session_start", "transfer", "session_end", "unknown"],
      default: "unknown",
      index: true,
    },
    transferId: {
      type: String,
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
      default: null,
      index: true,
    },
    memberAccount: {
      type: String,
      default: null,
      index: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model(
  "NineWicketCallbackEvent",
  nineWicketCallbackEventSchema,
);
