import axiosInstance from '../config/axiosConfig';

export const seoAPI = {
  // Get global SEO settings
  getGlobalSEOSettings: () => 
    axiosInstance.get('/api/seo-settings'),
  
  // Update global SEO settings
  updateGlobalSEOSettings: (data) => 
    axiosInstance.put('/api/seo-settings', data),
  
  // Get page-specific SEO settings
  getPageSEOSettings: (page) => 
    axiosInstance.get(`/api/seo-settings/pages/${page}`),
  
  // Update page SEO settings
  updatePageSEOSettings: (page, data) => 
    axiosInstance.put(`/api/seo-settings/pages/${page}`, data),
};

/**
 * SEO Settings Endpoints:
 * 
 * GET /api/seo-settings - Get global SEO settings
 * PUT /api/seo-settings - Update global SEO settings
 * GET /api/seo-settings/pages/:page - Get page-specific SEO settings
 * PUT /api/seo-settings/pages/:page - Update page SEO settings
 */