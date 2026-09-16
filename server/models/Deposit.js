const mongoose = require("mongoose");
const crypto = require("crypto");

const depositSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 1,
  },
  paymentMethod: {
    type: String,
    required: true,
  },
  paymentDetails: {
    fromNumber: {
      type: String,
      default: null,
    },
    toNumber: {
      type: String,
      default: null,
    },
    transactionId: {
      type: String,
      default: null,
    },
    proofImage: {
      type: String,
      default: null,
    },
  },
  // Gateway Fields
  propayDetails: {
    orderNo: {
      type: String,
      trim: true,
      default: undefined,
    },
    signature: {
      type: String,
      default: null,
    },
    gatewayStatus: {
      type: String,
      enum: [
        "initiated",
        "pending",
        "success",
        "failed",
        "cancelled",
        "completed",
      ],
      default: "initiated",
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    initiatedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  provider: {
    type: String,
    default: null,
  },
  // Promotion applied to this deposit
  promotion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Promotion",
    default: null,
  },
  promotionAppliedAt: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: [
      "pending",
      "approved",
      "rejected",
      "processing",
      "completed",
      "cancelled",
      "failed",
    ],
    default: "pending",
  },
  cancelledAt: {
    type: Date,
    default: null,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  approvedAt: {
    type: Date,
    default: null,
  },
  rejectionReason: {
    type: String,
    default: null,
  },
  referenceId: {
    type: String,
    unique: true,
    sparse: true,
  },
  adminNote: {
    type: String,
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

// ✅ CLEAN, SAFE, NO CALLBACK VERSION
depositSchema.pre("save", async function () {
  if (this.isNew && !this.referenceId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    this.referenceId = `DEP${timestamp}${random}`.toUpperCase();
  }

  this.updatedAt = Date.now();
});

depositSchema.index({ user: 1, createdAt: -1 });
depositSchema.index({ status: 1 });
depositSchema.index({ "paymentDetails.transactionId": 1 });
depositSchema.index({ provider: 1, status: 1, createdAt: -1 });
depositSchema.index({ referenceId: 1, provider: 1 });
depositSchema.index(
  { "propayDetails.orderNo": 1 },
  {
    unique: true,
    partialFilterExpression: {
      "propayDetails.orderNo": { $type: "string" },
    },
  },
);

module.exports = mongoose.model("Deposit", depositSchema);
