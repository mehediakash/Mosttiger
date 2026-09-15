const REQUIRED_ENV_KEYS = [
  "PAYMENT24X7_BASE_URL",
  "PAYMENT24X7_API_KEY",
  "PAYMENT24X7_API_SECRET",
  "PAYMENT24X7_CALLBACK_URL",
];

const normalizeBaseUrl = (value) => String(value || "").trim().replace(/\/+$/, "");

const getPayment24x7Config = () => ({
  baseUrl: normalizeBaseUrl(process.env.PAYMENT24X7_BASE_URL),
  apiKey: String(process.env.PAYMENT24X7_API_KEY || "").trim(),
  apiSecret: String(process.env.PAYMENT24X7_API_SECRET || "").trim(),
  callbackUrl: String(process.env.PAYMENT24X7_CALLBACK_URL || "").trim(),
  timeoutMs: Number(process.env.PAYMENT24X7_TIMEOUT_MS || 30000),
});

const validatePayment24x7Config = () => {
  const missing = REQUIRED_ENV_KEYS.filter(
    (key) => !String(process.env[key] || "").trim(),
  );

  if (missing.length) {
    const error = new Error(
      `Payment24x7 configuration error: missing required environment variable(s): ${missing.join(", ")}`,
    );
    error.code = "PAYMENT24X7_CONFIG_MISSING";
    error.missing = missing;
    throw error;
  }

  const config = getPayment24x7Config();

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
