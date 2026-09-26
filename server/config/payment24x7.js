const getEnv = (key1, key2) =>
  String(process.env[key1] || process.env[key2] || "").trim();

const normalizeBaseUrl = (value) =>
  String(value || "")
    .trim()
    .replace(/\/+$/, "");

const getPayment24x7Config = () => ({
  baseUrl: normalizeBaseUrl(getEnv("PAYMENT24X7_BASE_URL", "PAYDESK_BASE_URL")),
  apiKey: getEnv("PAYMENT24X7_API_KEY", "PAYDESK_API_KEY"),
  apiSecret: getEnv("PAYMENT24X7_API_SECRET", "PAYDESK_API_SECRET"),
  callbackUrl: getEnv("PAYMENT24X7_CALLBACK_URL", "PAYDESK_CALLBACK_URL"),
  timeoutMs: Number(
    process.env.PAYMENT24X7_TIMEOUT_MS ||
      process.env.PAYDESK_TIMEOUT_MS ||
      30000,
  ),
});

const validatePayment24x7Config = () => {
  const config = getPayment24x7Config();
  const missing = [];
  if (!config.baseUrl)
    missing.push("PAYMENT24X7_BASE_URL (or PAYDESK_BASE_URL)");
  if (!config.apiKey) missing.push("PAYMENT24X7_API_KEY (or PAYDESK_API_KEY)");
  if (!config.apiSecret)
    missing.push("PAYMENT24X7_API_SECRET (or PAYDESK_API_SECRET)");
  if (!config.callbackUrl)
    missing.push("PAYMENT24X7_CALLBACK_URL (or PAYDESK_CALLBACK_URL)");

  if (missing.length) {
    const error = new Error(
      `Payment24x7 configuration error: missing required environment variable(s): ${missing.join(", ")}`,
    );
    error.code = "PAYMENT24X7_CONFIG_MISSING";
    error.missing = missing;
    throw error;
  }

  try {
    const parsed = new URL(config.baseUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Unsupported protocol");
    }
  } catch (error) {
    const configError = new Error(
      "Payment24x7 configuration error: PAYMENT24X7_BASE_URL must be a valid HTTP(S) URL",
    );
    configError.code = "PAYMENT24X7_CONFIG_INVALID_BASE_URL";
    throw configError;
  }

  try {
    const parsed = new URL(config.callbackUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Unsupported protocol");
    }
  } catch (error) {
    const configError = new Error(
      "Payment24x7 configuration error: PAYMENT24X7_CALLBACK_URL must be a valid HTTP(S) URL",
    );
    configError.code = "PAYMENT24X7_CONFIG_INVALID_CALLBACK_URL";
    throw configError;
  }

  if (!Number.isFinite(config.timeoutMs) || config.timeoutMs <= 0) {
    const configError = new Error(
      "Payment24x7 configuration error: PAYMENT24X7_TIMEOUT_MS must be a positive number",
    );
    configError.code = "PAYMENT24X7_CONFIG_INVALID_TIMEOUT";
    throw configError;
  }

  return config;
};

module.exports = {
  getPayment24x7Config,
  validatePayment24x7Config,
};
