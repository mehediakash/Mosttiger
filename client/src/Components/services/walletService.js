import api from "../axios/axios";

export const getBalance = () => api.get("/api/wallet/balance");

export const getTransactions = (params) =>
  api.get("/api/wallet/transactions", { params });

export const getWalletTransactions = (params) =>
  api.get("/api/wallet-transactions", { params });

export const transferBetweenWallets = (payload) =>
  api.post("/api/wallet/transfer", payload);

export const getDepositMethods = () => api.get("/api/payments/deposit-methods");

export const createDeposit = (payload) => {
  // payload can be either a plain object or a FormData instance.
  // If it's already FormData (the UI may construct it), use it directly.
  let fd;
  if (typeof FormData !== "undefined" && payload instanceof FormData) {
    fd = payload;
  } else {
    fd = new FormData();
    Object.keys(payload).forEach((k) => {
      if (payload[k] !== undefined && payload[k] !== null) {
        fd.append(k, payload[k]);
      }
    });
  }

  // Send FormData using the api instance; axios/browser will set the proper
  // multipart Content-Type including boundary now that the instance has no
  // forced default Content-Type header.
  return api.post("/api/payments/deposit-methods", fd);
};

export const getDepositHistory = (params) =>
  api.get("/api/payments/deposits", { params });

export const getWithdrawalMethods = () =>
  api.get("/api/payments/withdrawal-methods");

export const createWithdrawal = (payload) =>
  api.post("/api/payments/withdraw", payload);

export const applyPromoCode = (payload) =>
  api.post("/api/promo-codes/apply", payload);

export const getDepositSuccess = (depositId) =>
  api.get(`/api/payments/deposit-success/${depositId}`);

export default {
  getBalance,
  getTransactions,
  getWalletTransactions,
  transferBetweenWallets,
  getDepositMethods,
  createDeposit,
  getDepositHistory,
  getWithdrawalMethods,
  createWithdrawal,
  applyPromoCode,
  getDepositSuccess,
};
