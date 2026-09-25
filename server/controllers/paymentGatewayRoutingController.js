const paymentGatewayRoutingService = require("../services/paymentGatewayRoutingService");

const formatGatewayResponse = (config) => {
  const activeUpper = config.activeGateway
    ? String(config.activeGateway).toUpperCase()
    : null;

  return {
    activeGateway: activeUpper,
    gateways: {
      PAYMENT24X7: {
        name: "PAYMENT24X7",
        status: config.gateways?.payment24x7?.enabled ? "ON" : "OFF",
        isActive: activeUpper === "PAYMENT24X7",
      },
      UDDOKTAPAY: {
        name: "UDDOKTAPAY",
        status: config.gateways?.uddoktapay?.enabled ? "ON" : "OFF",
        isActive: activeUpper === "UDDOKTAPAY",
      },
    },
    raw: {
      activeGateway: config.activeGateway,
      gateways: config.gateways,
      updatedAt: config.updatedAt,
    },
    updatedAt: config.updatedAt,
  };
};

// @desc    Get payment gateway routing configuration (Admin)
// @route   GET /api/admin/payment-gateway, GET /api/admin/payment-gateways/routing
// @access  Private (Admin only)
exports.getRoutingConfig = async (req, res) => {
  try {
    const config = await paymentGatewayRoutingService.getRoutingConfig();
    const formatted = formatGatewayResponse(config);

    return res.status(200).json({
      success: true,
      ...formatted,
    });
  } catch (error) {
    console.error("Get payment gateway routing config error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching payment gateway configuration",
    });
  }
};

// @desc    Switch active payment gateway (Admin)
// @route   PUT /api/admin/payment-gateway, PUT /api/admin/payment-gateways/routing
// @access  Private (Admin only)
exports.switchGateway = async (req, res) => {
  try {
    const targetGateway =
      req.body.gateway || req.body.activeGateway || req.body.nextActive;

    const updated = await paymentGatewayRoutingService.switchGateway(
      targetGateway,
      req.user?._id || req.user?.id,
    );
    const formatted = formatGatewayResponse(updated);

    return res.status(200).json({
      success: true,
      message: "Payment gateway switched successfully.",
      ...formatted,
    });
  } catch (error) {
    console.error("Switch payment gateway error:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Server error while switching payment gateway",
    });
  }
};

// Backward-compatible alias
exports.updateRoutingConfig = exports.switchGateway;

// @desc    Get currently active payment gateway for frontend (Public/User safe)
// @route   GET /api/payment-gateway/active
// @access  Public
exports.getActiveGatewayPublic = async (req, res) => {
  try {
    const active = await paymentGatewayRoutingService.getActiveGateway();
    const activeUpper = active ? active.toUpperCase() : null;

    return res.status(200).json({
      success: true,
      activeGateway: activeUpper,
      showProviderSelection: activeUpper === "PAYMENT24X7",
    });
  } catch (error) {
    console.error("Get active payment gateway error:", error);
    return res.status(500).json({
      success: false,
      activeGateway: null,
      showProviderSelection: false,
      message: "Failed to determine active payment gateway",
    });
  }
};
