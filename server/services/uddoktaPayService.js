const axios = require("axios");

const UDDOKTAPAY_BASE_URL = "https://mosttiger.paymently.io/api";
const UDDOKTAPAY_API_KEY = "eyGLeJm697b0WHpwDFM41y5sr888nuVmgtUD589V";

const client = axios.create({
  baseURL: UDDOKTAPAY_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

const getErrorMessage = (error) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "UddoktaPay request failed"
  );
};

const extractPaymentUrl = (payload) => {
  return (
    payload?.payment_url ||
    payload?.paymentUrl ||
    payload?.checkout_url ||
    payload?.checkoutUrl ||
    payload?.url ||
    payload?.data?.payment_url ||
    payload?.data?.paymentUrl ||
    payload?.data?.checkout_url ||
    payload?.data?.checkoutUrl ||
    payload?.data?.url ||
    null
  );
};

const extractInvoiceId = (payload) => {
  return (
    payload?.invoice_id ||
    payload?.invoiceId ||
    payload?.data?.invoice_id ||
    payload?.data?.invoiceId ||
    payload?.data?.invoice ||
    null
  );
};

const createPayment = async ({
  fullName,
  email,
  amount,
  metadata,
  redirectUrl,
  cancelUrl,
  webhookUrl,
}) => {
  if (!UDDOKTAPAY_API_KEY) {
    throw new Error("UDDOKTAPAY_API_KEY is not configured");
  }

  const payload = {
    full_name: fullName,
    email,
    amount,
    redirect_url: redirectUrl,
    return_type: "GET",
    cancel_url: cancelUrl,
    webhook_url: webhookUrl,
    metadata,
  };

  const response = await client.post("/checkout-v2", payload, {
    headers: {
      "RT-UDDOKTAPAY-API-KEY": UDDOKTAPAY_API_KEY,
    },
  });

  const responseData = response?.data || {};
  const paymentUrl = extractPaymentUrl(responseData);
  const invoiceId = extractInvoiceId(responseData);

  if (!paymentUrl) {
    throw new Error("UddoktaPay did not return a payment URL");
  }

  return {
    raw: responseData,
    paymentUrl,
    invoiceId,
  };
};

const verifyPayment = async (invoiceId) => {
  if (!invoiceId) {
    throw new Error("invoice_id is required");
  }

  if (!UDDOKTAPAY_API_KEY) {
    throw new Error("UDDOKTAPAY_API_KEY is not configured");
  }

  const response = await client.post(
    "/verify-payment",
    { invoice_id: invoiceId },
    {
      headers: {
        "RT-UDDOKTAPAY-API-KEY": UDDOKTAPAY_API_KEY,
      },
    },
  );

  console.log("VERIFY PAYMENT RESPONSE:", response.data);

  return {
    raw: response?.data || {},
    message: response?.data?.message || null,
  };
};

module.exports = {
  createPayment,
  verifyPayment,
  getErrorMessage,
  extractInvoiceId,
  extractPaymentUrl,
};
