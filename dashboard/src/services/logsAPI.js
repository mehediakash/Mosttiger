import axiosInstance from '../config/axiosConfig';

export const logsAPI = {
  // Get login logs
  getLoginLogs: (params) => 
    axiosInstance.get('/api/login-logs', { params }),
  
  // Get suspicious logins
  getSuspiciousLogins: () => 
    axiosInstance.get('/api/login-logs/suspicious'),
  
  // Get user activity logs
  getUserActivityLogs: (params) => 
    axiosInstance.get('/api/user-management/activity-logs', { params }),
};

/**
 * Login Logs Endpoints:
 * 
 * GET /api/login-logs - Get all login logs
 * GET /api/login-logs/suspicious - Get suspicious login attempts
 * GET /api/user-management/activity-logs - Get user activity logs
 */