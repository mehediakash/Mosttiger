const multer = require("multer");
const {
  ALLOWED_CHAT_ATTACHMENT_MIME_TYPES,
  MAX_CHAT_ATTACHMENT_SIZE_BYTES,
} = require("../services/cloudinaryUploadService");

const memoryStorage = multer.memoryStorage();

const chatAttachmentFilter = (req, file, cb) => {
  if (!ALLOWED_CHAT_ATTACHMENT_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      new Error("Only JPG, JPEG, PNG, WEBP, and PDF files are allowed"),
      false,
    );
  }

  return cb(null, true);
};

const chatAttachmentUpload = multer({
  storage: memoryStorage,
  fileFilter: chatAttachmentFilter,
  limits: {
    fileSize: MAX_CHAT_ATTACHMENT_SIZE_BYTES,
    files: 1,
  },
});

const handleChatAttachmentUploadError = (err, req, res, next) => {
  if (!err) return next();

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      message: "File size must not exceed 2 MB",
    });
  }

  if (err.code === "LIMIT_FILE_COUNT") {
    return res.status(422).json({
      success: false,
      message: "Only one attachment can be uploaded at a time",
    });
  }

  return res.status(422).json({
    success: false,
    message: err.message || "Invalid attachment upload",
  });
};

const singleChatAttachment = (fieldName = "attachment") => [
  chatAttachmentUpload.single(fieldName),
  handleChatAttachmentUploadError,
];

module.exports = {
  chatAttachmentUpload,
  handleChatAttachmentUploadError,
  singleChatAttachment,
};
