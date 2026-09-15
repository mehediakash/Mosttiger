const REQUIRED_ENV = [
  "NINEWICKET_API_BASE_URL",
  "NINEWICKET_TOKEN",
  "NINEWICKET_SECRET",
  "NINEWICKET_CALLBACK_URL",
  "NINEWICKET_RETURN_URL",
  "NINEWICKET_CURRENCY",
];

class NineWicketConfigError extends Error {
  constructor(message, code = "NINEWICKET_CONFIG_ERROR") {
    super(message);
    this.name = "NineWicketConfigError";
    this.code = code;
  }
}

function parseUrl(value, envName) {
  try {
    const parsed = new URL(String(value).trim());
    if (!["https:", "http:"].includes(parsed.protocol)) {
      throw new Error("Invalid protocol");
    }
    return parsed;
  } catch {
    throw new NineWicketConfigError(
      `${envName} must be a valid URL`,
      `${envName}_INVALID`,
    );
  }
}

function normalizeBaseUrl(value) {
  const parsed = parseUrl(value, "NINEWICKET_API_BASE_URL");
  const normalizedPath = parsed.pathname.replace(/\/+$/, "");

  if (/\/9w\/play$/i.test(normalizedPath)) {
    throw new NineWicketConfigError(
      "NINEWICKET_API_BASE_URL must be the account API Base URL from Client Panel, not the 9Wicket sportsbook play URL",
      "NINEWICKET_API_BASE_URL_IS_PLAY_URL",
    );
  }

  if (parsed.search || parsed.hash) {
    throw new NineWicketConfigError(
      "NINEWICKET_API_BASE_URL must not include query string or hash",
      "NINEWICKET_API_BASE_URL_INVALID",
    );
  }

  return parsed.toString().replace(/\/+$/, "");
}

function readNineWicketConfig() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new NineWicketConfigError(
      `Missing 9Wicket configuration: ${missing.join(", ")}`,
      "NINEWICKET_CONFIG_MISSING",
    );
  }

  const secret = String(process.env.NINEWICKET_SECRET);
  if (secret.length !== 32) {
    throw new NineWicketConfigError(
      "9Wicket secret must be exactly 32 characters",
      "NINEWICKET_SECRET_INVALID",
    );
  }

  const currency = String(process.env.NINEWICKET_CURRENCY).trim().toUpperCase();
  if (!currency || currency === "USDT") {
    throw new NineWicketConfigError(
      "9Wicket currency must be a supported play currency and cannot be USDT",
      "NINEWICKET_CURRENCY_INVALID",
    );
  }

  const apiBaseUrl = normalizeBaseUrl(process.env.NINEWICKET_API_BASE_URL);
  const callbackUrl = String(process.env.NINEWICKET_CALLBACK_URL).trim();
  const parsedCallbackUrl = parseUrl(callbackUrl, "NINEWICKET_CALLBACK_URL");
  if (!callbackUrl.startsWith("https://")) {
    throw new NineWicketConfigError(
      "9Wicket callback URL must use HTTPS",
      "NINEWICKET_CALLBACK_URL_INVALID",
    );
  }

  if (parsedCallbackUrl.pathname !== "/api/9wicket/callback") {
    throw new NineWicketConfigError(
      "NINEWICKET_CALLBACK_URL must point to the backend /api/9wicket/callback route",
      "NINEWICKET_CALLBACK_URL_ROUTE_INVALID",
    );
  }

  const returnUrl = String(process.env.NINEWICKET_RETURN_URL).trim();
  const parsedReturnUrl = parseUrl(returnUrl, "NINEWICKET_RETURN_URL");
  if (parsedReturnUrl.pathname !== "/casino") {
    throw new NineWicketConfigError(
      "NINEWICKET_RETURN_URL must point to the existing frontend /casino lobby route",
      "NINEWICKET_RETURN_URL_ROUTE_INVALID",
    );
  }

  return {
    apiBaseUrl,
    token: String(process.env.NINEWICKET_TOKEN),
    secret,
    callbackUrl,
    returnUrl,
    currency,
    timeoutMs: Number(process.env.NINEWICKET_TIMEOUT_MS || 5000),
    gameCacheTtlSeconds: Number(
      process.env.NINEWICKET_GAME_CACHE_TTL_SECONDS || 300,
    ),
  };
}

function getNineWicketConfigStatus() {
  const config = readNineWicketConfig();
  return {
    apiBaseUrlConfigured: Boolean(config.apiBaseUrl),
    tokenConfigured: Boolean(config.token),
    secretConfigured: Boolean(config.secret),
    callbackUrlConfigured: Boolean(config.callbackUrl),
    returnUrlConfigured: Boolean(config.returnUrl),
    currency: config.currency,
  };
}

module.exports = {
  REQUIRED_ENV,
  NineWicketConfigError,
  readNineWicketConfig,
  getNineWicketConfigStatus,
};
