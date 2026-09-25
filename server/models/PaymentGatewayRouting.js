const mongoose = require("mongoose");

const paymentGatewayRoutingSchema = new mongoose.Schema(
  {
    activeGateway: {
      type: String,
      enum: ["uddoktapay", "payment24x7", null],
      default: "payment24x7",
    },
    gateways: {
      uddoktapay: {
        enabled: {
          type: Boolean,
          default: false,
        },
        name: {
          type: String,
          default: "UDDOKTAPAY",
        },
      },
      payment24x7: {
        enabled: {
          type: Boolean,
          default: true,
        },
        name: {
          type: String,
          default: "PAYMENT24X7",
        },
      },
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model(
  "PaymentGatewayRouting",
  paymentGatewayRoutingSchema,
);
