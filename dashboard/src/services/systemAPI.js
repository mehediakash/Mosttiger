import axiosInstance from '../config/axiosConfig';

export const systemAPI = {
  // Get system health
  getSystemHealth: () => 
    axiosInstance.get('/api/admin/system-health'),
  
  // Get platform financial summary
  getPlatformSummary: () => 
    axiosInstance.get('/api/admin-financial/platform-summary'),
};

/**
 * System Health Endpoints:
 * 
 * GET /api/admin/system-health - Get detailed system health information
 * GET /api/admin-financial/platform-summary - Get platform financial summary
 */