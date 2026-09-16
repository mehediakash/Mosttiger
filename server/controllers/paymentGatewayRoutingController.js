const paymentGatewayRoutingService = require("../services/paymentGatewayRoutingService");

// @desc    Get payment gateway routing configuration
// @route   GET /api/admin/payment-gateways/routing
// @access  Private (Admin only)
exports.getRoutingConfig = async (req, res) => {
  try {
    const config = await paymentGatewayRoutingService.getRoutingConfig();

    return res.status(200).json({
      success: true,
      data: {
        activeGateway: config.activeGateway,
        gateways: config.gateways,
        updatedAt: config.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get payment gateway routing config error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching payment gateway routing settings",
    });
  }
};

// @desc    Update payment gateway routing configuration
// @route   PUT /api/admin/payment-gateways/routing
// @access  Private (Admin only)
exports.updateRoutingConfig = async (req, res) => {
  try {
    const updated = await paymentGatewayRoutingService.updateRoutingConfig(
      req.body,
      req.user?._id || req.user?.id,
    );

    return res.status(200).json({
      success: true,
      message: "Payment gateway routing configuration updated successfully",
      data: {
        activeGateway: updated.activeGateway,
        gateways: updated.gateways,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update payment gateway routing config error:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message:
        error.message ||
        "Server error while updating payment gateway routing settings",
    });
  }
};
