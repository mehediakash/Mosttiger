const PaymentGatewayRouting = require("../models/PaymentGatewayRouting");
const logger = require("../utils/logger");

const GATEWAY_KEYS = ["uddoktapay", "payment24x7"];

const getRoutingConfig = async () => {
  let config = await PaymentGatewayRouting.findOne();

  if (!config) {
    config = await PaymentGatewayRouting.create({
      activeGateway: "payment24x7",
      gateways: {
        payment24x7: {
          enabled: true,
          name: "PAYMENT24X7",
        },
        uddoktapay: {
          enabled: false,
          name: "UDDOKTAPAY",
        },
      },
    });
  }

  return config;
};

const getActiveGateway = async () => {
  const config = await getRoutingConfig();

  const active = String(config.activeGateway || "")
    .toLowerCase()
    .trim();

  if (!GATEWAY_KEYS.includes(active)) {
    return null;
  }

  const gatewayInfo = config.gateways?.[active];
  if (!gatewayInfo || !gatewayInfo.enabled) {
    return null;
  }

  return active;
};

const updateRoutingConfig = async (payload = {}, adminUserId = null) => {
  const current = await getRoutingConfig();

  const nextActive = payload.activeGateway
    ? String(payload.activeGateway).toLowerCase().trim()
    : current.activeGateway;

  if (!GATEWAY_KEYS.includes(nextActive)) {
    const error = new Error(
      `Invalid active gateway. Must be one of: ${GATEWAY_KEYS.join(", ")}`,
    );
    error.statusCode = 400;
    throw error;
  }

  const nextGateways = {
    uddoktapay: {
      name: "UDDOKTAPAY",
      enabled:
        payload.gateways?.uddoktapay?.enabled !== undefined
          ? Boolean(payload.gateways.uddoktapay.enabled)
          : (current.gateways?.uddoktapay?.enabled ?? false),
    },
    payment24x7: {
      name: "PAYMENT24X7",
      enabled:
        payload.gateways?.payment24x7?.enabled !== undefined
          ? Boolean(payload.gateways.payment24x7.enabled)
          : (current.gateways?.payment24x7?.enabled ?? true),
    },
  };

  // Rule 1: Cannot disable both gateways
  const anyEnabled = Object.values(nextGateways).some((g) => g.enabled);
  if (!anyEnabled) {
    const error = new Error(
      "Cannot disable all gateways. At least one payment gateway must remain enabled.",
    );
    error.statusCode = 400;
    throw error;
  }

  // Rule 2: Active gateway must be enabled
  if (!nextGateways[nextActive]?.enabled) {
    const error = new Error(
      `Cannot set '${nextActive.toUpperCase()}' as active because it is disabled. Please enable it first.`,
    );
    error.statusCode = 400;
    throw error;
  }

  current.activeGateway = nextActive;
  current.gateways = nextGateways;
  current.updatedBy = adminUserId || current.updatedBy;
  current.markModified("gateways");

  await current.save();

  logger.info("Payment gateway routing configuration updated", {
    activeGateway: current.activeGateway,
    gateways: current.gateways,
    adminUserId: adminUserId?.toString?.(),
  });

  return current;
};

module.exports = {
  GATEWAY_KEYS,
  getRoutingConfig,
  getActiveGateway,
  updateRoutingConfig,
};
