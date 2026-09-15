import api from "../axios/axios";

export const getDashboard = () => api.get("/api/referrals/dashboard");

export const getStatistics = () => api.get("/api/referrals/statistics");

export const getReferrals = (params) => api.get("/api/referrals/list", { params });

export const getReferralDetails = (relationshipId) =>
  api.get(`/api/referrals/${relationshipId}`);

export const getPendingBonuses = (params) =>
  api.get("/api/referrals/pending-bonus", { params });

export const claimBonus = (bonusId) =>
  api.post(`/api/referrals/bonuses/${bonusId}/claim`);

export const getBonusStatus = () => api.get("/api/referrals/bonus/status");

export const getBonusHistory = (params) =>
  api.get("/api/referrals/bonus/history", { params });

export const getTurnover = () => api.get("/api/referrals/turnover");

export default {
  getDashboard,
  getStatistics,
  getReferrals,
  getReferralDetails,
  getPendingBonuses,
  claimBonus,
  getBonusStatus,
  getBonusHistory,
  getTurnover,
};
