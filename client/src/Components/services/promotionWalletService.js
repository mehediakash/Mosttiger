import api from "../axios/axios";

export const getMyBonuses = () => api.get("/api/promotions/my-bonuses");

export const getMyFreeSpins = () => api.get("/api/promotions/my-free-spins");

export const claimBonus = (turnoverId) =>
  api.post(`/api/promotions/claim-bonus/${turnoverId}`);

export const claimFreeSpins = (promotionId) =>
  api.post(`/api/promotions/claim-free-spins/${promotionId}`);

export const getReferralBonuses = () =>
  api.get("/api/referrals/pending-bonus", { params: { page: 1, limit: 50 } });

export const getReferralBonusStatus = () => api.get("/api/referrals/bonus/status");

export const getReferralTurnover = () => api.get("/api/referrals/turnover");

export const claimReferralBonus = (bonusId) =>
  api.post(`/api/referrals/bonuses/${bonusId}/claim`);

export default {
  getMyBonuses,
  getMyFreeSpins,
  claimBonus,
  claimFreeSpins,
  getReferralBonuses,
  getReferralBonusStatus,
  getReferralTurnover,
  claimReferralBonus,
};
