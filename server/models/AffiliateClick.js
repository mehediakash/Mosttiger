const mongoose = require("mongoose");

const affiliateClickSchema = new mongoose.Schema({
  affiliate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  affiliateCode: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
  },
  ip: {
    type: String,
    trim: true,
    default: "",
  },
  userAgent: {
    type: String,
    trim: true,
    default: "",
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

affiliateClickSchema.index({ affiliate: 1, createdAt: -1 });
affiliateClickSchema.index({ affiliateCode: 1, createdAt: -1 });

module.exports = mongoose.model("AffiliateClick", affiliateClickSchema);
