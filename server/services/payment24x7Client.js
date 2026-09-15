const axios = require("axios");
const { getPayment24x7Config } = require("../config/payment24x7");
const logger = require("../utils/logger");
const {
  buildPayment24x7Headers,
  stringifyPayment24x7Body,
} = require("../utils/payment24x7Signature");

class Payment24x7Error extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "Payment24x7Error";
    this.code = options.code || "PAYMENT24X7_REQUEST_FAILED";
    this.status = options.status || 500;
    this.details = options.details;
    this.reference = options.reference;
    this.merchantReference = options.merchantReference;
    this.isOperational = true;
  }
}

const getRequestContext = (payload = {}) => ({
  requestId: payload.requestId || payload.request_id || undefined,
  merchantReference:
    payload.merchant_reference || payload.merchantReference || undefined,
  reference: payload.reference || undefined,
});

const normalizePayment24x7Error = (error, context = {}) => {
  if (error instanceof Payment24x7Error) return error;

  if (error?.response) {
    const status = error.response.status || 500;
    const data = error.response.data || {};
    const message =
      data.message ||
      data.error ||
      (status === 401
        ? "Payment24x7 authentication failed"
        : "Payment24x7 request failed");

    return new Payment24x7Error(message, {
      status,
      code:
        status === 401
          ? "PAYMENT24X7_AUTH_ERROR"
          : status === 422
            ? "PAYMENT24X7_VALIDATION_ERROR"
            : "PAYMENT24X7_API_ERROR",
      details: data.errors,
      reference: context.reference,
      merchantReference: context.merchantReference,
    });
  }

  if (error?.code === "ECONNABORTED") {
    return new Payment24x7Error("Payment24x7 request timed out", {
      status: 504,
      code: "PAYMENT24X7_TIMEOUT",
      reference: context.reference,
      merchantReference: context.merchantReference,
    });
  }

  if (error?.request) {
    return new Payment24x7Error("Payment24x7 network error", {
      status: 503,
      code: "PAYMENT24X7_NETWORK_ERROR",
      reference: context.reference,
      merchantReference: context.merchantReference,
    });
  }

  return new Payment24x7Error(error?.message || "Payment24x7 request failed", {
    status: 500,
    code: "PAYMENT24X7_INTERNAL_ERROR",
    reference: context.reference,
    merchantReference: context.merchantReference,
  });
};

const createPayment24x7AxiosClient = () => {
  const { baseUrl, timeoutMs } = getPayment24x7Config();

  return axios.create({
    baseURL: baseUrl,
    timeout: timeoutMs,
    headers: {
      Accept: "application/json",
    },
  });
};

const signedPost = async (path, payload = {}) => {
  const context = getRequestContext(payload);
  const body = stringifyPayment24x7Body(payload);
  const headers = buildPayment24x7Headers({
    method: "POST",
    requestUri: path,
    rawBody: body,
  });

  logger.info("Payment24x7 API request", {
    ...context,
    method: "POST",
    path,
  });

  try {
    const client = createPayment24x7AxiosClient();
    const response = await client.post(path, body, { headers });
    const data = response.data || {};

    logger.info("Payment24x7 API response", {
      ...context,
      reference: data.reference || context.reference,
      status: response.status,
      gatewayStatus: data.status,
    });

    return data;
  } catch (error) {
    const normalized = normalizePayment24x7Error(error, context);

    logger.error("Payment24x7 API error", {
      ...context,
      path,
      status: normalized.status,
      code: normalized.code,
      message: normalized.message,
    });

    throw normalized;
  }
};

const unsignedGet = async (path, context = {}) => {
  logger.info("Payment24x7 API request", {
    ...context,
    method: "GET",
    path,
  });

  try {
    const client = createPayment24x7AxiosClient();
    const response = await client.get(path, {
      headers: {
        Accept: "application/json",
      },
    });
    const data = response.data || {};

    logger.info("Payment24x7 API response", {
      ...context,
      reference: data.reference || context.reference,
      status: response.status,
      gatewayStatus: data.status,
    });

    return data;
  } catch (error) {
    const normalized = normalizePayment24x7Error(error, context);

    logger.error("Payment24x7 API error", {
      ...context,
      path,
      status: normalized.status,
      code: normalized.code,
      message: normalized.message,
    });

    throw normalized;
  }
};

module.exports = {
  Payment24x7Error,
  createPayment24x7AxiosClient,
  normalizePayment24x7Error,
  signedPost,
  unsignedGet,
};
