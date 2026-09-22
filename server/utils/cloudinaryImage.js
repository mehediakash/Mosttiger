const path = require("path");

const ALLOWED_IMAGE_MIME_TYPES = Object.freeze([
  "image/webp",
  "image/png",
  "image/jpeg",
]);

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

const normalizeCloudinaryFolder = (folder) => {
  const value =
    typeof folder === "string" && folder.trim()
      ? folder.trim()
      : process.env.CLOUDINARY_UPLOAD_FOLDER || "ck369/uploads";

  const normalized = value
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) => segment.trim().replace(/[^a-zA-Z0-9_-]/g, "-"))
    .filter(Boolean)
    .join("/");

  return normalized || "ck369/uploads";
};

const getCloudinaryResourceType = () => "image";

const getImagePublicIdFromUrl = (url) => {
  if (typeof url !== "string" || !url.includes("/upload/")) return "";

  const [, afterUpload] = url.split("/upload/");
  if (!afterUpload) return "";

  const withoutVersion = afterUpload.replace(/^v\d+\//, "");
  const parsed = path.posix.parse(withoutVersion);

  return path.posix.join(parsed.dir, parsed.name);
};

const isAllowedImageMimeType = (mimeType) =>
  ALLOWED_IMAGE_MIME_TYPES.includes(mimeType);

module.exports = {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  getCloudinaryResourceType,
  getImagePublicIdFromUrl,
  isAllowedImageMimeType,
  normalizeCloudinaryFolder,
};
