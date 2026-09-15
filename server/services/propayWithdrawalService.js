const axios = require("axios");

const PROPAY_API_KEY =
  process.env.PROPAY_API_KEY || "YnFCCyjFlcB0AEs0Xu9fT9wS6TfPAj5mTq0QprGI";
const PROPAY_MERCHANT_ID = process.env.PROPAY_MERCHANT_ID || "";

const WITHDRAW_URL = "https://checkout.propay.cyou/pay/api-withdraw.php";
const STATUS_URL = "https://checkout.propay.cyou/pay/api-status-check.php";
const BALANCE_URL = "https://checkout.propay.cyou/pay/balance-check.php";

const normalizeProvider = (provider) => {
  const value = String(provider || "").toLowerCase().trim();
  if (value === "nagad" || value === "nogod") return "nagad";
  if (value === "bkash") return "bkash";
  return "";
};

const toBankCode = (provider) =>
  normalizeProvider(provider) === "nagad" ? "Nagad" : "Bkash";

const postForm = async (url, params) => {
  const formData = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });

  const response = await axios.post(url, formData, {
    timeout: 30000,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  return response.data || {};
};

const submitWithdrawal = async ({ amount, provider, accountNumber }) => {
  if (!PROPAY_API_KEY) {
    throw new Error("PROPAY_API_KEY is not configured");
  }
  if (!normalizeProvider(provider)) {
    throw new Error("Invalid withdrawal payment method");
  }

  return postForm(WITHDRAW_URL, {
    api_key: PROPAY_API_KEY,
    amount: Number(amount).toFixed(2),
    bank_code: toBankCode(provider),
    account_number: accountNumber,
  });
};

const checkWithdrawalStatus = async (orderNo) => {
  if (!PROPAY_API_KEY) {
    throw new Error("PROPAY_API_KEY is not configured");
  }

  return postForm(STATUS_URL, {
    api_key: PROPAY_API_KEY,
    order_no: orderNo,
  });
};

const checkBalance = async () => {
  if (!PROPAY_API_KEY || !PROPAY_MERCHANT_ID) {
    throw new Error("PROPAY_MERCHANT_ID and PROPAY_API_KEY are required");
  }

  return postForm(BALANCE_URL, {
    merchant_id: PROPAY_MERCHANT_ID,
    api_key: PROPAY_API_KEY,
  });
};

const isSuccessResponse = (payload) =>
  String(payload?.status || "").toLowerCase() === "success";

const getErrorMessage = (error) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "ProPay withdrawal request failed"
  );
};

module.exports = {
  checkBalance,
  checkWithdrawalStatus,
  getErrorMessage,
  isSuccessResponse,
  normalizeProvider,
  submitWithdrawal,
  toBankCode,
};
