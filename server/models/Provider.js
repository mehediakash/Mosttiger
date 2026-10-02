const mongoose = require("mongoose");

const providerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    displayName: {
      type: String,
      trim: true,
      default: "",
    },
    logo: {
      type: String,
      trim: true,
      default: "",
    },
    displayOrder: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

providerSchema.index({ displayOrder: 1 });
providerSchema.index({ name: 1 });

module.exports = mongoose.model("Provider", providerSchema);
