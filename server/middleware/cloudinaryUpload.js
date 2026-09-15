const multer = require("multer");
const {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  isAllowedImageMimeType,
} = require("../utils/cloudinaryImage");

const memoryStorage = multer.memoryStorage();

const imageFileFilter = (req, file, cb) => {
  if (!isAllowedImageMimeType(file.mimetype)) {
    return cb(new Error("Only WEBP, PNG, and JPEG images are allowed"), false);
  }

  return cb(null, true);
};

const cloudinaryImageUpload = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
    files: 1,
  },
});

const handleMulterImageError = (err, req, res, next) => {
  if (!err) return next();

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      message: "Image size must not exceed 2 MB",
    });
  }

  if (err.code === "LIMIT_FILE_COUNT") {
    return res.status(422).json({
      success: false,
      message: "Only one image can be uploaded at a time",
    });
  }

  return res.status(422).json({
    success: false,
    message: err.message || "Invalid image upload",
  });
};

const singleCloudinaryImage = (fieldName = "image") => [
  cloudinaryImageUpload.single(fieldName),
  handleMulterImageError,
];

module.exports = {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  cloudinaryImageUpload,
  handleMulterImageError,
  singleCloudinaryImage,
};
