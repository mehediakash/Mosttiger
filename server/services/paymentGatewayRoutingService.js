const PaymentGatewayRouting = require("../models/PaymentGatewayRouting");
const logger = require("../utils/logger");

const GATEWAY_KEYS = ["payment24x7", "uddoktapay"];

const normalizeGatewayKey = (key) => {
  if (!key) return null;
  const lower = String(key).trim().toLowerCase();
  if (lower === "none" || lower === "null" || lower === "") return null;
  if (GATEWAY_KEYS.includes(lower)) return lower;
  return lower;
};

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

  const active = normalizeGatewayKey(config.activeGateway);
  if (!active || !GATEWAY_KEYS.includes(active)) {
    return null;
  }

  const gatewayInfo = config.gateways?.[active];
  if (!gatewayInfo || !gatewayInfo.enabled) {
    return null;
  }

  return active;
};

/**
 * Switch payment gateway atomically with mutual exclusivity.
 * Only ONE gateway can be active at a time.
 * If PAYMENT24X7 is ON, UDDOKTAPAY is OFF.
 * If UDDOKTAPAY is ON, PAYMENT24X7 is OFF.
 * If target is null/none, both are turned OFF.
 */
const switchGateway = async (targetGateway, adminUserId = null) => {
  const normalized = normalizeGatewayKey(targetGateway);

  if (normalized !== null && !GATEWAY_KEYS.includes(normalized)) {
    const error = new Error(
      `Invalid payment gateway '${targetGateway}'. Valid values are: PAYMENT24X7, UDDOKTAPAY`,
    );
    error.statusCode = 400;
    throw error;
  }

  const current = await getRoutingConfig();
  const previousGateway = current.activeGateway;

  const update = {
    activeGateway: normalized,
    gateways: {
      payment24x7: {
        name: "PAYMENT24X7",
        enabled: normalized === "payment24x7",
      },
      uddoktapay: {
        name: "UDDOKTAPAY",
        enabled: normalized === "uddoktapay",
      },
    },
    updatedBy: adminUserId || null,
  };

  const updated = await PaymentGatewayRouting.findOneAndUpdate(
    {},
    { $set: update },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  logger.info("Admin changed payment gateway", {
    previousGateway: previousGateway ? previousGateway.toUpperCase() : "NONE",
    newGateway: normalized ? normalized.toUpperCase() : "NONE",
    adminUserId: adminUserId?.toString?.() || "system",
    time: new Date().toISOString(),
  });

  return updated;
};

/**
 * Backward-compatible routing update handler
 */
const updateRoutingConfig = async (payload = {}, adminUserId = null) => {
  const target = payload.gateway || payload.activeGateway;

  if (target !== undefined) {
    return switchGateway(target, adminUserId);
  }

  // If specific enabled flags passed
  const uddoktaRequested = payload.gateways?.uddoktapay?.enabled;
  const payment24x7Requested = payload.gateways?.payment24x7?.enabled;

  if (uddoktaRequested && !payment24x7Requested) {
    return switchGateway("uddoktapay", adminUserId);
  }
  if (payment24x7Requested && !uddoktaRequested) {
    return switchGateway("payment24x7", adminUserId);
  }

  return getRoutingConfig();
};

module.exports = {
  GATEWAY_KEYS,
  getRoutingConfig,
  getActiveGateway,
  switchGateway,
  updateRoutingConfig,
};
