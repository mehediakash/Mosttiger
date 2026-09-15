import axiosInstance from '../config/axiosConfig';

export const fraudAPI = {
  // Get fraud alerts
  getFraudAlerts: (params) => 
    axiosInstance.get('/api/fraud-detection/alerts', { params }),
  
  // Resolve fraud alert
  resolveAlert: (alertId, data) => 
    axiosInstance.post(`/api/fraud-detection/alerts/${alertId}/resolve`, data),
  
  // Get suspicious logins
  getSuspiciousLogins: () => 
    axiosInstance.get('/api/login-logs/suspicious'),
  
  // Get provider health status
  getProviderHealth: () => 
    axiosInstance.get('/api/provider-health/status'),
  
  // Manual health check
  manualHealthCheck: () => 
    axiosInstance.post('/api/provider-health/check'),
};

/**
 * Fraud Detection Endpoints:
 * 
 * GET /api/fraud-detection/alerts - Get fraud alerts
 * POST /api/fraud-detection/alerts/:alertId/resolve - Resolve fraud alert
 * GET /api/login-logs/suspicious - Get suspicious login attempts
 * GET /api/provider-health/status - Get provider health status
 * POST /api/provider-health/check - Manual health check
 */