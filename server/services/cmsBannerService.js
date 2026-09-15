const mongoose = require("mongoose");
const CMSBanner = require("../models/CMSBanner");
const cloudinaryUploadService = require("./cloudinaryUploadService");
const { CMS_BANNER_STATUS } = require("../constants/cmsBanner");

class CMSBannerError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "CMSBannerError";
    this.statusCode = statusCode;
  }
}

const cleanString = (value) => (typeof value === "string" ? value.trim() : "");

const cleanBannerType = (value) =>
  cleanString(value).toLowerCase().replace(/\s+/g, "-");

const toNonNegativeNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
};

const normalizeStatus = (value) => {
  const status = cleanString(value).toLowerCase();
  if (!status) return CMS_BANNER_STATUS.ACTIVE;
  if (!Object.values(CMS_BANNER_STATUS).includes(status)) {
    throw new CMSBannerError("Status must be active or inactive", 422);
  }
  return status;
};

const validateObjectId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new CMSBannerError("CMS banner not found", 404);
  }
};

const buildBannerPayload = (payload = {}) => {
  const title = cleanString(payload.title);
  const bannerType = cleanBannerType(payload.bannerType);

  if (!title) throw new CMSBannerError("Title is required", 422);
  if (!bannerType) throw new CMSBannerError("Banner type is required", 422);

  return {
    title,
    description: cleanString(payload.description),
    bannerType,
    status: normalizeStatus(payload.status),
    targetUrl: cleanString(payload.targetUrl),
    sortOrder: toNonNegativeNumber(payload.sortOrder, 0),
  };
};

class CMSBannerService {
  async createBanner(payload, file, adminId) {
    if (!file) {
      throw new CMSBannerError("Banner image is required", 422);
    }

    const data = buildBannerPayload(payload);
    const uploaded = await cloudinaryUploadService.uploadImage(file, {
      folder: `mosttiger/cms-banners/${data.bannerType}`,
    });

    try {
      return await CMSBanner.create({
        ...data,
        image: uploaded.secureUrl,
        cloudinaryPublicId: uploaded.publicId,
        createdBy: adminId,
        updatedBy: adminId,
      });
    } catch (error) {
      await cloudinaryUploadService
        .deleteImage(uploaded.publicId)
        .catch(() => null);
      throw error;
    }
  }

  async updateBanner(id, payload, file, adminId) {
    validateObjectId(id);

    const banner = await CMSBanner.findById(id);
    if (!banner) throw new CMSBannerError("CMS banner not found", 404);

    const data = buildBannerPayload({
      title: payload.title ?? banner.title,
      description: payload.description ?? banner.description,
      bannerType: payload.bannerType ?? banner.bannerType,
      status: payload.status ?? banner.status,
      targetUrl: payload.targetUrl ?? banner.targetUrl,
      sortOrder: payload.sortOrder ?? banner.sortOrder,
    });

    Object.assign(banner, data, { updatedBy: adminId });

    if (file) {
      const previousPublicId = banner.cloudinaryPublicId;
      const uploaded = await cloudinaryUploadService.uploadImage(file, {
        folder: `mosttiger/cms-banners/${data.bannerType}`,
      });
      banner.image = uploaded.secureUrl;
      banner.cloudinaryPublicId = uploaded.publicId;

      try {
        await banner.save();
      } catch (error) {
        await cloudinaryUploadService
          .deleteImage(uploaded.publicId)
          .catch(() => null);
        throw error;
      }
      await cloudinaryUploadService.deleteImage(previousPublicId);
      return banner;
    }

    await banner.save();
    return banner;
  }

  async deleteBanner(id) {
    validateObjectId(id);

    const banner = await CMSBanner.findById(id);
    if (!banner) throw new CMSBannerError("CMS banner not found", 404);

    await cloudinaryUploadService.deleteImage(banner.cloudinaryPublicId);
    await banner.deleteOne();

    return { deleted: true, id };
  }

  async getBannerDetails(id) {
    validateObjectId(id);

    const banner = await CMSBanner.findById(id)
      .populate("createdBy", "username fullName email")
      .populate("updatedBy", "username fullName email")
      .lean();
    if (!banner) throw new CMSBannerError("CMS banner not found", 404);

    return banner;
  }

  async listBanners(query = {}) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
    const filter = {};

    if (query.bannerType) filter.bannerType = cleanBannerType(query.bannerType);
    if (query.status) filter.status = normalizeStatus(query.status);
    if (query.search) {
      const search = cleanString(query.search);
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const [banners, total] = await Promise.all([
      CMSBanner.find(filter)
        .populate("createdBy", "username fullName email")
        .sort({ sortOrder: 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      CMSBanner.countDocuments(filter),
    ]);

    return {
      banners,
      pagination: {
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        limit,
      },
    };
  }

  async changeStatus(id, status, adminId) {
    validateObjectId(id);

    const banner = await CMSBanner.findByIdAndUpdate(
      id,
      { status: normalizeStatus(status), updatedBy: adminId },
      { new: true, runValidators: true },
    );
    if (!banner) throw new CMSBannerError("CMS banner not found", 404);
    return banner;
  }

  async reorderBanners(items = [], adminId) {
    if (!Array.isArray(items) || !items.length) {
      throw new CMSBannerError("Reorder items are required", 422);
    }

    const operations = items.map((item) => {
      validateObjectId(item.id || item._id);
      return {
        updateOne: {
          filter: { _id: item.id || item._id },
          update: {
            $set: {
              sortOrder: toNonNegativeNumber(item.sortOrder, 0),
              updatedBy: adminId,
            },
          },
        },
      };
    });

    await CMSBanner.bulkWrite(operations);
    return { updated: operations.length };
  }

  async listPublicBanners(type) {
    const bannerType = cleanBannerType(type);
    if (!bannerType) throw new CMSBannerError("Banner type is required", 422);

    return CMSBanner.find({
      bannerType,
      status: CMS_BANNER_STATUS.ACTIVE,
    })
      .select(
        "title description image bannerType targetUrl sortOrder updatedAt",
      )
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();
  }
}

module.exports = new CMSBannerService();
module.exports.CMSBannerError = CMSBannerError;
