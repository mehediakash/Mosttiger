const Announcement = require("../models/Announcement");

/**
 * @desc    Get active announcements for public NewsTicker
 * @route   GET /api/announcements/active
 * @access  Public
 */
exports.getActiveAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find({ isActive: true })
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: announcements.length,
      data: announcements,
    });
  } catch (error) {
    console.error("Error fetching active announcements:", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching announcements",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all announcements for Admin Panel
 * @route   GET /api/admin/announcements
 * @access  Private (Admin)
 */
exports.getAllAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .sort({ displayOrder: 1, createdAt: -1 })
      .populate("createdBy", "username name email")
      .populate("updatedBy", "username name email")
      .lean();

    return res.status(200).json({
      success: true,
      count: announcements.length,
      data: announcements,
    });
  } catch (error) {
    console.error("Error fetching admin announcements:", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching admin announcements",
      error: error.message,
    });
  }
};

/**
 * @desc    Create a new announcement
 * @route   POST /api/admin/announcements
 * @access  Private (Admin)
 */
exports.createAnnouncement = async (req, res) => {
  try {
    const { title, message, isActive, displayOrder } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Announcement message is required",
      });
    }

    const announcement = await Announcement.create({
      title: title ? title.trim() : "",
      message: message.trim(),
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      displayOrder: displayOrder !== undefined ? Number(displayOrder) : 0,
      createdBy: req.user?._id || null,
    });

    return res.status(201).json({
      success: true,
      message: "Announcement created successfully",
      data: announcement,
    });
  } catch (error) {
    console.error("Error creating announcement:", error);
    return res.status(500).json({
      success: false,
      message: "Server error creating announcement",
      error: error.message,
    });
  }
};

/**
 * @desc    Update an announcement
 * @route   PUT /api/admin/announcements/:id
 * @access  Private (Admin)
 */
exports.updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, message, isActive, displayOrder } = req.body;

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    if (title !== undefined) announcement.title = title.trim();
    if (message !== undefined) {
      if (!message.trim()) {
        return res.status(400).json({
          success: false,
          message: "Announcement message cannot be empty",
        });
      }
      announcement.message = message.trim();
    }
    if (isActive !== undefined) announcement.isActive = Boolean(isActive);
    if (displayOrder !== undefined)
      announcement.displayOrder = Number(displayOrder);

    announcement.updatedBy = req.user?._id || null;

    await announcement.save();

    return res.status(200).json({
      success: true,
      message: "Announcement updated successfully",
      data: announcement,
    });
  } catch (error) {
    console.error("Error updating announcement:", error);
    return res.status(500).json({
      success: false,
      message: "Server error updating announcement",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete an announcement
 * @route   DELETE /api/admin/announcements/:id
 * @access  Private (Admin)
 */
exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findByIdAndDelete(id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Announcement deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting announcement:", error);
    return res.status(500).json({
      success: false,
      message: "Server error deleting announcement",
      error: error.message,
    });
  }
};

/**
 * @desc    Toggle announcement status
 * @route   PATCH /api/admin/announcements/:id/status
 * @access  Private (Admin)
 */
exports.toggleAnnouncementStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    announcement.isActive =
      isActive !== undefined ? Boolean(isActive) : !announcement.isActive;
    announcement.updatedBy = req.user?._id || null;

    await announcement.save();

    return res.status(200).json({
      success: true,
      message: `Announcement ${
        announcement.isActive ? "activated" : "deactivated"
      } successfully`,
      data: announcement,
    });
  } catch (error) {
    console.error("Error toggling announcement status:", error);
    return res.status(500).json({
      success: false,
      message: "Server error toggling announcement status",
      error: error.message,
    });
  }
};
