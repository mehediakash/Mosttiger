import axiosInstance from '../config/axiosConfig';

export const promoAPI = {
  // Get all promo codes (admin)
  getPromoCodes: (params) => 
    axiosInstance.get('/api/admin/promo-codes', { params }),
  
  // Create promo code (admin)
  createPromoCode: (data) => 
    axiosInstance.post('/api/admin/promo-codes', data),
  
  // Update promo code (admin)
  updatePromoCode: (id, data) => 
    axiosInstance.put(`/api/admin/promo-codes/${id}`, data),
  
  // Apply promo code (user)
  applyPromoCode: (data) => 
    axiosInstance.post('/api/promo-codes/apply', data),
  
  // Get user's promo codes
  getMyPromoCodes: () => 
    axiosInstance.get('/api/promo-codes/my-codes'),
  
  // Get promo code details
  getPromoDetails: (code) => 
    axiosInstance.get(`/api/promo-codes/?code=${code}`),
  
  // Get promo analytics (admin)
  getPromoAnalytics: (id) => 
    axiosInstance.get(`/api/promo-codes/${id}/analytics`),
};

/**
 * Promo Code Endpoints:
 * 
 * GET /api/admin/promo-codes - Get all promo codes (admin)
 * POST /api/admin/promo-codes - Create promo code (admin)
 * PUT /api/admin/promo-codes/:id - Update promo code (admin)
 * POST /api/promo-codes/apply - Apply promo code (user)
 * GET /api/promo-codes/my-codes - Get user's promo codes
 * GET /api/promo-codes/?code=:code - Get promo code details
 * GET /api/promo-codes/:id/analytics - Get promo analytics (admin)
 */