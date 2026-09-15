import axiosInstance from '../config/axiosConfig';

export const feesAPI = {
  // Get global withdrawal fees
  getGlobalFees: () => 
    axiosInstance.get('/api/withdrawal-fees/global'),
  
  // Update global fees
  updateGlobalFees: (data) => 
    axiosInstance.put('/api/withdrawal-fees/global', data),
  
  // Set custom user fees
  setCustomUserFees: (userId, data) => 
    axiosInstance.put(`/api/withdrawal-fees/users/${userId}/custom`, data),
  
  // Get fee settings overview
  getFeeSettingsOverview: () => 
    axiosInstance.get('/api/withdrawal-fees/settings'),
};

/**
 * Withdrawal Fees Endpoints:
 * 
 * GET /api/withdrawal-fees/global - Get global withdrawal fee settings
 * PUT /api/withdrawal-fees/global - Update global withdrawal fees
 * PUT /api/withdrawal-fees/users/:userId/custom - Set custom fees for user
 * GET /api/withdrawal-fees/settings - Get fee settings overview
 */