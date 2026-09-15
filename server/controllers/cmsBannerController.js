const cmsBannerService = require("../services/cmsBannerService");
const { CMS_BANNER_TYPES } = require("../constants/cmsBanner");

const handleCMSBannerError = (res, error, fallbackMessage) => {
  if (
    error.name === "CMSBannerError" ||
    error.name === "CloudinaryUploadError"
  ) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }

  console.error(fallbackMessage, error);
  return res.status(500).json({
    success: false,
    message: fallbackMessage,
  });
};

exports.createBanner = async (req, res) => {
  try {
    const banner = await cmsBannerService.createBanner(
      req.body,
      req.file,
      req.user._id,
    );

    return res.status(201).json({
      success: true,
      message: "CMS banner created successfully.",
      data: banner,
    });
  } catch (error) {
    return handleCMSBannerError(
      res,
      error,
      "Server error while creating CMS banner",
    );
  }
};

exports.updateBanner = async (req, res) => {
  try {
    const banner = await cmsBannerService.updateBanner(
      req.params.bannerId,
      req.body,
      req.file,
      req.user._id,
    );

    return res.status(200).json({
      success: true,
      message: "CMS banner updated successfully.",
      data: banner,
    });
  } catch (error) {
    return handleCMSBannerError(
      res,
      error,
      "Server error while updating CMS banner",
    );
  }
};

exports.deleteBanner = async (req, res) => {
  try {
    const data = await cmsBannerService.deleteBanner(req.params.bannerId);
    return res.status(200).json({
      success: true,
      message: "CMS banner deleted successfully.",
      data,
    });
  } catch (error) {
    return handleCMSBannerError(
      res,
      error,
      "Server error while deleting CMS banner",
    );
  }
};

exports.getBannerDetails = async (req, res) => {
  try {
    const banner = await cmsBannerService.getBannerDetails(req.params.bannerId);
    return res.status(200).json({ success: true, data: banner });
  } catch (error) {
    return handleCMSBannerError(
      res,
      error,
      "Server error while fetching CMS banner",
    );
  }
};

exports.getBanners = async (req, res) => {
  try {
    const data = await cmsBannerService.listBanners(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleCMSBannerError(
      res,
      error,
      "Server error while fetching CMS banners",
    );
  }
};

exports.changeStatus = async (req, res) => {
  try {
    const banner = await cmsBannerService.changeStatus(
      req.params.bannerId,
      req.body.status,
      req.user._id,
    );
    return res.status(200).json({
      success: true,
      message: "CMS banner status updated successfully.",
      data: banner,
    });
  } catch (error) {
    return handleCMSBannerError(
      res,
      error,
      "Server error while updating CMS banner status",
    );
  }
};

exports.reorderBanners = async (req, res) => {
  try {
    const data = await cmsBannerService.reorderBanners(
      req.body.items,
      req.user._id,
    );
    return res.status(200).json({
      success: true,
      message: "CMS banners reordered successfully.",
      data,
    });
  } catch (error) {
    return handleCMSBannerError(
      res,
      error,
      "Server error while reordering CMS banners",
    );
  }
};

exports.getPublicFavoriteSliderBanners = async (req, res) => {
  try {
    const banners = await cmsBannerService.listPublicBanners(
      CMS_BANNER_TYPES.FAVORITE_SLIDER,
    );
    return res.status(200).json({
      success: true,
      data: { banners },
    });
  } catch (error) {
    return handleCMSBannerError(
      res,
      error,
      "Server error while fetching favorite slider banners",
    );
  }
};

exports.getPublicBannersByType = async (req, res) => {
  try {
    const banners = await cmsBannerService.listPublicBanners(req.params.type);
    return res.status(200).json({
      success: true,
      data: { banners },
    });
  } catch (error) {
    return handleCMSBannerError(
      res,
      error,
      "Server error while fetching CMS banners",
    );
  }
};
