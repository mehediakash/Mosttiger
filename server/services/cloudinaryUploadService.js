const { configureCloudinary } = require("../config/cloudinary");
const {
  getCloudinaryResourceType,
  getImagePublicIdFromUrl,
  isAllowedImageMimeType,
  MAX_IMAGE_SIZE_BYTES,
  normalizeCloudinaryFolder,
} = require("../utils/cloudinaryImage");

const ALLOWED_CHAT_ATTACHMENT_MIME_TYPES = Object.freeze([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const MAX_CHAT_ATTACHMENT_SIZE_BYTES = 2 * 1024 * 1024;

class CloudinaryUploadError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "CloudinaryUploadError";
    this.statusCode = statusCode;
  }
}

const validateImageFile = (file) => {
  if (!file) {
    throw new CloudinaryUploadError("Image file is required", 400);
  }

  if (!isAllowedImageMimeType(file.mimetype)) {
    throw new CloudinaryUploadError(
      "Only WEBP, PNG, and JPEG images are allowed",
      422,
    );
  }

  if (Number(file.size || 0) > MAX_IMAGE_SIZE_BYTES) {
    throw new CloudinaryUploadError("Image size must not exceed 2 MB", 413);
  }
};

const isAllowedChatAttachmentMimeType = (mimeType) =>
  ALLOWED_CHAT_ATTACHMENT_MIME_TYPES.includes(mimeType);

const getChatAttachmentResourceType = (mimeType) =>
  mimeType === "application/pdf" ? "raw" : "image";

const validateChatAttachmentFile = (file) => {
  if (!file) {
    throw new CloudinaryUploadError("Attachment file is required", 400);
  }

  if (!isAllowedChatAttachmentMimeType(file.mimetype)) {
    throw new CloudinaryUploadError(
      "Only JPG, JPEG, PNG, WEBP, and PDF files are allowed",
      422,
    );
  }

  if (Number(file.size || 0) > MAX_CHAT_ATTACHMENT_SIZE_BYTES) {
    throw new CloudinaryUploadError("File size must not exceed 2 MB", 413);
  }
};

const uploadBuffer = (file, options = {}) =>
  new Promise((resolve, reject) => {
    const cloudinary = configureCloudinary();
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: normalizeCloudinaryFolder(options.folder),
        resource_type: options.resourceType || getCloudinaryResourceType(),
        overwrite: false,
        use_filename: false,
        unique_filename: true,
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      },
    );

    stream.end(file.buffer);
  });

const formatUploadResult = (result) => ({
  url: result.secure_url,
  secureUrl: result.secure_url,
  publicId: result.public_id,
  assetId: result.asset_id,
  resourceType: result.resource_type,
  format: result.format,
  width: result.width,
  height: result.height,
  bytes: result.bytes,
  createdAt: result.created_at,
});

class CloudinaryUploadService {
  async uploadImage(file, options = {}) {
    validateImageFile(file);

    const uploaded = await uploadBuffer(file, options);
    const image = formatUploadResult(uploaded);

    if (options.previousPublicId) {
      await this.deleteImage(options.previousPublicId);
    }

    return image;
  }

  async replaceImage(file, previousImage, options = {}) {
    const previousPublicId =
      options.previousPublicId ||
      previousImage?.publicId ||
      getImagePublicIdFromUrl(previousImage?.url || previousImage);

    return this.uploadImage(file, {
      ...options,
      previousPublicId,
    });
  }

  async deleteImage(publicId) {
    if (!publicId || typeof publicId !== "string") {
      return { deleted: false, reason: "Public ID is required" };
    }

    const cloudinary = configureCloudinary();
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: getCloudinaryResourceType(),
      invalidate: true,
    });

    return {
      deleted: result.result === "ok" || result.result === "not found",
      result: result.result,
      publicId,
    };
  }

  async uploadChatAttachment(file, options = {}) {
    validateChatAttachmentFile(file);

    const uploaded = await uploadBuffer(file, {
      folder: options.folder || "mosttiger/live-chat",
      resourceType: getChatAttachmentResourceType(file.mimetype),
    });

    return formatUploadResult(uploaded);
  }

  async deleteChatAttachment(publicId, mimeType) {
    if (!publicId || typeof publicId !== "string") {
      return { deleted: false, reason: "Public ID is required" };
    }

    const cloudinary = configureCloudinary();
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: getChatAttachmentResourceType(mimeType),
      invalidate: true,
    });

    return {
      deleted: result.result === "ok" || result.result === "not found",
      result: result.result,
      publicId,
    };
  }
}

module.exports = new CloudinaryUploadService();
module.exports.CloudinaryUploadError = CloudinaryUploadError;
module.exports.validateImageFile = validateImageFile;
module.exports.validateChatAttachmentFile = validateChatAttachmentFile;
module.exports.ALLOWED_CHAT_ATTACHMENT_MIME_TYPES =
  ALLOWED_CHAT_ATTACHMENT_MIME_TYPES;
module.exports.MAX_CHAT_ATTACHMENT_SIZE_BYTES = MAX_CHAT_ATTACHMENT_SIZE_BYTES;
