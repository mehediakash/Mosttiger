const providerService = require("../services/providerService");

class ProviderController {
  // @desc    Get all active providers sorted by custom display order & Z-A
  // @route   GET /api/providers
  // @access  Public
  async getProviders(req, res) {
    try {
      const providers = await providerService.getActiveSortedProviders();
      res.status(200).json({
        success: true,
        data: providers,
      });
    } catch (error) {
      console.error("Get providers error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Server error while fetching providers",
      });
    }
  }

  // @desc    Get all providers for Admin with statistics
  // @route   GET /api/providers/admin
  // @access  Private (Admin)
  async getAdminProviders(req, res) {
    try {
      const result = await providerService.getAdminProviders(req.query);
      res.status(200).json({
        success: true,
        data: result.providers,
        total: result.total,
        orderedCount: result.orderedCount,
        unorderedCount: result.unorderedCount,
      });
    } catch (error) {
      console.error("Get admin providers error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Server error while fetching admin providers",
      });
    }
  }

  // @desc    Create a new provider
  // @route   POST /api/providers
  // @access  Private (Admin)
  async createProvider(req, res) {
    try {
      const provider = await providerService.createProvider(req.body);
      res.status(201).json({
        success: true,
        message: "Provider created successfully",
        data: provider,
      });
    } catch (error) {
      console.error("Create provider error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create provider",
      });
    }
  }

  // @desc    Update provider (e.g. displayOrder, status)
  // @route   PATCH /api/providers/:id or PUT /api/providers/:id
  // @access  Private (Admin)
  async updateProvider(req, res) {
    try {
      const { id } = req.params;
      const updated = await providerService.updateProvider(id, req.body);
      res.status(200).json({
        success: true,
        message: "Provider updated successfully",
        data: updated,
      });
    } catch (error) {
      console.error("Update provider error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update provider",
      });
    }
  }

  // @desc    Delete provider
  // @route   DELETE /api/providers/:id
  // @access  Private (Admin)
  async deleteProvider(req, res) {
    try {
      const { id } = req.params;
      await providerService.deleteProvider(id);
      res.status(200).json({
        success: true,
        message: "Provider deleted successfully",
      });
    } catch (error) {
      console.error("Delete provider error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to delete provider",
      });
    }
  }
}

module.exports = new ProviderController();

