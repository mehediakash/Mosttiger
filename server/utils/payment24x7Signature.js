const crypto = require("crypto");
const { getPayment24x7Config } = require("../config/payment24x7");

const CLOCK_SKEW_SECONDS = 300;

const stringifyPayment24x7Body = (payload) => JSON.stringify(payload || {});

const signPayment24x7Request = ({
  timestamp,
  method,
  requestUri,
  rawBody,
  apiSecret,
}) => {
  const signaturePayload = [
    String(timestamp),
    String(method || "").toUpperCase(),
    requestUri,
    rawBody || "",
  ].join("\n");

  return crypto
    .createHmac("sha256", apiSecret)
    .update(signaturePayload)
    .digest("hex");
};

const timingSafeEqualHex = (left, right) => {
  const leftValue = String(left || "");
  const rightValue = String(right || "");

  if (!/^[a-f0-9]{64}$/i.test(leftValue) || !/^[a-f0-9]{64}$/i.test(rightValue)) {
    return false;
  }

  const leftBuffer = Buffer.from(leftValue, "hex");
  const rightBuffer = Buffer.from(rightValue, "hex");

  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
};

const buildPayment24x7Headers = ({
  method,
  requestUri,
  rawBody,
  timestamp = String(Math.floor(Date.now() / 1000)),
}) => {
  const { apiKey, apiSecret } = getPayment24x7Config();

  const signature = signPayment24x7Request({
    timestamp,
    method,
    requestUri,
    rawBody,
    apiSecret,
  });

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-PayDesk-Key": apiKey,
    "X-PayDesk-Timestamp": timestamp,
    "X-PayDesk-Signature": signature,
  };
};

const verifyPayment24x7CallbackSignature = ({
  headers = {},
  method = "POST",
  requestUri,
  rawBody,
}) => {
  const { apiKey, apiSecret } = getPayment24x7Config();
  const receivedKey = headers["x-paydesk-key"] || headers["X-PayDesk-Key"];
  const timestamp =
    headers["x-paydesk-timestamp"] || headers["X-PayDesk-Timestamp"];
  const signature =
    headers["x-paydesk-signature"] || headers["X-PayDesk-Signature"];

  if (!apiKey || !apiSecret) {
    return { valid: false, reason: "Payment24x7 credentials are not configured" };
  }

  if (receivedKey !== apiKey) {
    return { valid: false, reason: "Invalid key" };
  }

  if (!/^\d+$/.test(String(timestamp || ""))) {
    return { valid: false, reason: "Invalid timestamp" };
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > CLOCK_SKEW_SECONDS) {
    return { valid: false, reason: "Expired timestamp" };
  }

  const expected = signPayment24x7Request({
    timestamp: String(timestamp),
    method,
    requestUri,
    rawBody: rawBody || "",
    apiSecret,
  });

  if (!timingSafeEqualHex(expected, signature)) {
    return { valid: false, reason: "Invalid signature" };
  }

  return { valid: true };
};

module.exports = {
  buildPayment24x7Headers,
  signPayment24x7Request,
  stringifyPayment24x7Body,
  verifyPayment24x7CallbackSignature,
};
