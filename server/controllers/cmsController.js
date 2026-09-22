const CMSContent = require("../models/CMSContent");
const cloudinaryUploadService = require("../services/cloudinaryUploadService");

const CMS_CONTENT_IMAGE_FOLDER = "ck369/cms-content";

const parseJSONField = (value, fallback) => {
  if (value === undefined) return fallback;
  if (value === null || value === "") return fallback;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
};

const parseBooleanField = (value, fallback = true) => {
  if (value === undefined) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true";
  return Boolean(value);
};

const normalizeContentBody = (body = {}) => ({
  ...body,
  isActive: parseBooleanField(body.isActive, true),
  metadata: parseJSONField(body.metadata, body.metadata || {}),
});

class CMSController {
  // Create CMS content
  async createContent(req, res) {
    let uploadedImage = null;
    try {
      const body = normalizeContentBody(req.body);
      const {
        type,
        title,
        content,
        isActive,
        order,
        metadata,
        startDate,
        endDate,
      } = body;

      if (req.file) {
        uploadedImage = await cloudinaryUploadService.uploadImage(req.file, {
          folder: CMS_CONTENT_IMAGE_FOLDER,
        });
      }

      const cmsContent = new CMSContent({
        type,
        title,
        content,
        image: uploadedImage?.secureUrl || null,
        cloudinaryPublicId: uploadedImage?.publicId || null,
        isActive: isActive !== undefined ? isActive : true,
        order: order || 0,
        metadata: metadata || {},
        startDate: startDate || null,
        endDate: endDate || null,
        createdBy: req.user.id,
      });

      await cmsContent.save();

      res.status(201).json({
        success: true,
        message: "CMS content created successfully",
        data: cmsContent,
      });
    } catch (error) {
      if (uploadedImage?.publicId) {
        await cloudinaryUploadService
          .deleteImage(uploadedImage.publicId)
          .catch(() => null);
      }

      console.error("Create CMS content error:", error);
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      res.status(500).json({
        success: false,
        message: "Server error while creating CMS content",
      });
    }
  }

  // Get CMS content by type
  async getContentByType(req, res) {
    try {
      const { type } = req.params;
      const { activeOnly = "true" } = req.query;

      const query = { type };

      if (activeOnly === "true") {
        query.isActive = true;
        // Filter by date range if applicable
        query.$or = [
          { startDate: null, endDate: null },
          { startDate: { $lte: new Date() }, endDate: { $gte: new Date() } },
          { startDate: { $lte: new Date() }, endDate: null },
          { startDate: null, endDate: { $gte: new Date() } },
        ];
      }

      const content = await CMSContent.find(query)
        .populate("createdBy", "fullName email")
        .sort({ order: 1, createdAt: -1 })
        .exec();

      res.status(200).json({
        success: true,
        data: content,
      });
    } catch (error) {
      console.error("Get CMS content error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching CMS content",
      });
    }
  }

  // Update CMS content
  async updateContent(req, res) {
    let uploadedImage = null;
    try {
      const { contentId } = req.params;
      const updates = normalizeContentBody(req.body);

      const content = await CMSContent.findById(contentId);

      if (!content) {
        return res.status(404).json({
          success: false,
          message: "CMS content not found",
        });
      }

      const previousPublicId = content.cloudinaryPublicId;

      if (req.file) {
        uploadedImage = await cloudinaryUploadService.uploadImage(req.file, {
          folder: CMS_CONTENT_IMAGE_FOLDER,
        });
        updates.image = uploadedImage.secureUrl;
        updates.cloudinaryPublicId = uploadedImage.publicId;
      } else {
        delete updates.image;
        delete updates.cloudinaryPublicId;
      }

      Object.assign(content, updates, { updatedBy: req.user.id });
      await content.save();

      if (uploadedImage?.publicId && previousPublicId) {
        await cloudinaryUploadService.deleteImage(previousPublicId);
      }

      await content.populate("createdBy", "fullName email");

      res.status(200).json({
        success: true,
        message: "CMS content updated successfully",
        data: content,
      });
    } catch (error) {
      if (uploadedImage?.publicId) {
        await cloudinaryUploadService
          .deleteImage(uploadedImage.publicId)
          .catch(() => null);
      }

      console.error("Update CMS content error:", error);
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      res.status(500).json({
        success: false,
        message: "Server error while updating CMS content",
      });
    }
  }

  // Delete CMS content
  async deleteContent(req, res) {
    try {
      const { contentId } = req.params;

      const content = await CMSContent.findById(contentId);

      if (!content) {
        return res.status(404).json({
          success: false,
          message: "CMS content not found",
        });
      }

      if (content.cloudinaryPublicId) {
        await cloudinaryUploadService.deleteImage(content.cloudinaryPublicId);
      }

      await content.deleteOne();

      res.status(200).json({
        success: true,
        message: "CMS content deleted successfully",
      });
    } catch (error) {
      console.error("Delete CMS content error:", error);
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      res.status(500).json({
        success: false,
        message: "Server error while deleting CMS content",
      });
    }
  }

  // Get all CMS content for admin
  async getAllContent(req, res) {
    try {
      const { page = 1, limit = 20, type, isActive } = req.query;

      const query = {};
      if (type) query.type = type;
      if (isActive !== undefined) query.isActive = isActive === "true";

      const content = await CMSContent.find(query)
        .populate("createdBy", "fullName email")
        .populate("updatedBy", "fullName email")
        .sort({ type: 1, order: 1, createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec();

      const total = await CMSContent.countDocuments(query);

      res.status(200).json({
        success: true,
        data: {
          content,
          totalPages: Math.ceil(total / limit),
          currentPage: parseInt(page),
          total,
        },
      });
    } catch (error) {
      console.error("Get all CMS content error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching CMS content",
      });
    }
  }
}

module.exports = new CMSController();
