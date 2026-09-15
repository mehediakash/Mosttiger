import axiosInstance from '../config/axiosConfig';

export const healthAPI = {
  // Get provider health status
  getProviderHealth: () => 
    axiosInstance.get('/api/provider-health/status'),
  
  // Manual health check
  manualHealthCheck: () => 
    axiosInstance.post('/api/provider-health/check'),
  
  // Get system health
  getSystemHealth: () => 
    axiosInstance.get('/api/admin/system-health'),
};

/**
 * Health Monitoring Endpoints:
 * 
 * GET /api/provider-health/status - Get provider health status
 * POST /api/provider-health/check - Manual health check
 * GET /api/admin/system-health - Get system health overview
 */