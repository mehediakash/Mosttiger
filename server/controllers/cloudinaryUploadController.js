const cloudinaryUploadService = require("../services/cloudinaryUploadService");

const handleCloudinaryUploadError = (res, error, fallbackMessage) => {
  if (error.name === "CloudinaryUploadError") {
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

exports.uploadImage = async (req, res) => {
  try {
    const image = await cloudinaryUploadService.uploadImage(req.file, {
      folder: req.body.folder || req.query.folder,
      previousPublicId: req.body.previousPublicId,
    });

    return res.status(201).json({
      success: true,
      message: "Image uploaded successfully.",
      data: image,
    });
  } catch (error) {
    return handleCloudinaryUploadError(
      res,
      error,
      "Server error while uploading image",
    );
  }
};

exports.deleteImage = async (req, res) => {
  try {
    const publicId = req.body.publicId || req.params.publicId;
    const data = await cloudinaryUploadService.deleteImage(publicId);

    if (!data.deleted) {
      return res.status(400).json({
        success: false,
        message: data.reason || "Image could not be deleted",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Image deleted successfully.",
      data,
    });
  } catch (error) {
    return handleCloudinaryUploadError(
      res,
      error,
      "Server error while deleting image",
    );
  }
};
