import api from "../axios/axios";

// Promo codes (public promo code endpoints)
export const getActivePromos = () => api.get("/api/promos");
export const getPromoDetails = (code) => api.get(`/api/promo-codes/${code}`);
export const validatePromoCode = (promoCode) =>
  api.post("/api/promos/validate", { promoCode });

// Promotions (list of promotion entries displayed on public site)
export const getActivePromotions = () =>
  api.get("/api/promotions?status=active");

export default {
  getActivePromos,
  getPromoDetails,
  validatePromoCode,
  getActivePromotions,
};
