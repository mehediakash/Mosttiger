import api from "../axios/axios";

export const affiliateAPI = {
  getStatus: () => api.get("/api/affiliates/status"),
  getProfile: () => api.get("/api/affiliates/profile"),
  apply: (data) => api.post("/api/affiliates/apply", data),
  getPlayers: (params) => api.get("/api/affiliates/players", { params }),
  getStatistics: () => api.get("/api/affiliates/statistics"),
  getTransactions: (params) =>
    api.get("/api/affiliates/transactions", { params }),
  requestWithdrawal: (data) => api.post("/api/affiliates/withdrawals", data),
  getWithdrawals: (params) => api.get("/api/affiliates/withdrawals", { params }),
};
