const { getPayment24x7Config } = require("../config/payment24x7");
const logger = require("../utils/logger");
const {
  verifyPayment24x7CallbackSignature,
} = require("../utils/payment24x7Signature");
const {
  normalizePayment24x7Error,
  signedPost,
  unsignedGet,
} = require("./payment24x7Client");

const SUPPORTED_METHODS = new Set(["bkash", "nagad", "rocket"]);

const normalizeMethod = (method) => {
  const value = String(method || "").toLowerCase().trim();
  return SUPPORTED_METHODS.has(value) ? value : "";
};

const removeUndefined = (payload) =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );

const assertSupportedMethod = (method, type) => {
  const normalizedMethod = normalizeMethod(method);
  if (!normalizedMethod) {
    throw normalizePayment24x7Error(
      new Error(`Invalid Payment24x7 ${type} method`),
      {},
    );
  }

  return normalizedMethod;
};

const createDeposit = async ({
  merchantReference,
  amount,
  method,
  customerName,
  customerEmail,
  metadata,
  callbackUrl,
}) => {
  const normalizedMethod = assertSupportedMethod(method, "deposit");
  const { callbackUrl: defaultCallbackUrl } = getPayment24x7Config();

  const payload = removeUndefined({
    merchant_reference: merchantReference,
    amount: Number(amount),
    currency: "BDT",
    method: normalizedMethod,
    customer_name: customerName || undefined,
    customer_email: customerEmail || undefined,
    callback_url: callbackUrl || defaultCallbackUrl,
    metadata: metadata || undefined,
  });

  const response = await signedPost("/api/v1/deposits", payload);

  logger.debug("Payment24x7 deposit created", {
    merchantReference,
    reference: response.reference,
    gatewayStatus: response.status,
  });

  return response;
};

const createWithdrawal = async ({
  merchantReference,
  amount,
  method,
  accountNumber,
  customerName,
  customerMobile,
  metadata,
  callbackUrl,
}) => {
  const normalizedMethod = assertSupportedMethod(method, "withdrawal");
  const { callbackUrl: defaultCallbackUrl } = getPayment24x7Config();

  const payload = removeUndefined({
    merchant_reference: merchantReference,
    amount: Number(amount),
    currency: "BDT",
    method: normalizedMethod,
    account_number: accountNumber,
    customer_name: customerName || undefined,
    customer_mobile: customerMobile || undefined,
    callback_url: callbackUrl || defaultCallbackUrl,
    metadata: metadata || undefined,
  });

  const response = await signedPost("/api/v1/withdrawals", payload);

  logger.debug("Payment24x7 withdrawal created", {
    merchantReference,
    reference: response.reference,
    gatewayStatus: response.status,
  });

  return response;
};

const getPaymentStatus = async (reference) => {
  if (!reference) {
    throw normalizePayment24x7Error(
      new Error("Payment24x7 reference is required"),
      {},
    );
  }

  return unsignedGet(`/api/payments/status/${encodeURIComponent(reference)}`, {
    reference,
  });
};

const verifyCallbackSignature = ({ headers, method, requestUri, rawBody }) =>
  verifyPayment24x7CallbackSignature({
    headers,
    method,
    requestUri,
    rawBody,
  });

const getErrorMessage = (error) =>
  error?.message || "Payment24x7 request failed";

module.exports = {
  checkDepositStatus: getPaymentStatus,
  createDeposit,
  createWithdrawal,
  getErrorMessage,
  getPaymentStatus,
  normalizeMethod,
  verifyCallbackSignature,
};
