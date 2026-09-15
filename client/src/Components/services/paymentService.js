import api from "../axios/axios";

export const createPayment = ({ amount, provider, selectedPromotionId }) =>
  api.post("/api/payments/create", {
    amount,
    provider: provider ? String(provider).toLowerCase() : undefined,
    selectedPromotionId: selectedPromotionId || undefined,
  });

export const verifyPayment = (payload) =>
  api.post("/api/payments/verify", payload);

export const cancelPayment = (payload) =>
  api.post("/api/payments/cancel", payload);

export default {
  createPayment,
  verifyPayment,
  cancelPayment,
};
