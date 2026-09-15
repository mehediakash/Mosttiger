const crypto = require("crypto");

const PROPAY_API_KEY =
  process.env.PROPAY_API_KEY || "YnFCCyjFlcB0AEs0Xu9fT9wS6TfPAj5mTq0QprGI";

const GATEWAY_URLS = {
  bkash: "https://checkout.propay.cyou/pay/Bkash.php",
  nagad: "https://checkout.propay.cyou/pay/Nagad.php",
};

const normalizeProvider = (provider) => {
  const value = String(provider || "").toLowerCase().trim();
  return value === "nagad" ? "nagad" : "bkash";
};

const createPayment = ({
  userId,
  amount,
  orderNo,
  provider,
  returnUrl,
  callbackUrl,
}) => {
  if (!PROPAY_API_KEY) {
    throw new Error("PROPAY_API_KEY is not configured");
  }

  const normalizedProvider = normalizeProvider(provider);
  const gatewayUrl = GATEWAY_URLS[normalizedProvider];
  const params = new URLSearchParams({
    api_key: PROPAY_API_KEY,
    uid: String(userId),
    amount: String(Number(amount)),
    order_no: String(orderNo),
    return_url: returnUrl,
    pass_through_key: PROPAY_API_KEY,
    pass_through_callback_url: callbackUrl,
  });

  return {
    paymentUrl: `${gatewayUrl}?${params.toString()}`,
    provider: normalizedProvider,
    orderNo: String(orderNo),
  };
};

const verifySignature = ({ orderNo, amount, signature }) => {
  if (!PROPAY_API_KEY) {
    throw new Error("PROPAY_API_KEY is not configured");
  }

  const receivedSignature = String(signature || "");
  if (!orderNo || !amount || !receivedSignature) {
    return false;
  }

  const formattedAmount = Number(amount);
  if (!Number.isFinite(formattedAmount)) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", PROPAY_API_KEY)
    .update(`${orderNo}${formattedAmount}`)
    .digest("hex");

  const receivedBuffer = Buffer.from(receivedSignature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  return (
    receivedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  );
};

const getErrorMessage = (error) => {
  return error?.message || "ProPay request failed";
};

module.exports = {
  createPayment,
  getErrorMessage,
  normalizeProvider,
  verifySignature,
};
