const mongoose = require("mongoose");
const { CMS_BANNER_STATUS } = require("../constants/cmsBanner");

const cmsBannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },
    image: {
      type: String,
      required: true,
      trim: true,
    },
    cloudinaryPublicId: {
      type: String,
      required: true,
      trim: true,
    },
    bannerType: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    status: {
      type: String,
      enum: Object.values(CMS_BANNER_STATUS),
      default: CMS_BANNER_STATUS.ACTIVE,
    },
    targetUrl: {
      type: String,
      trim: true,
      default: "",
    },
    sortOrder: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

cmsBannerSchema.index({ bannerType: 1, status: 1, sortOrder: 1 });
cmsBannerSchema.index({ createdAt: -1 });

module.exports = mongoose.model("CMSBanner", cmsBannerSchema);
