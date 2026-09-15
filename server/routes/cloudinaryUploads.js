const express = require("express");
const cloudinaryUploadController = require("../controllers/cloudinaryUploadController");
const { protect, authorize } = require("../middleware/auth");
const { singleCloudinaryImage } = require("../middleware/cloudinaryUpload");

const router = express.Router();

router.use(protect);
router.use(authorize("admin"));

router.post(
  "/image",
  singleCloudinaryImage("image"),
  cloudinaryUploadController.uploadImage,
);
router.delete("/image", cloudinaryUploadController.deleteImage);

module.exports = router;
