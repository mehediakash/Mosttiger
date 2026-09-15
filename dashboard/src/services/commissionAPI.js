import axiosInstance from '../config/axiosConfig';

export const commissionAPI = {
  // Get commission summary
  getCommissionSummary: (params) => 
    axiosInstance.get('/api/agents/commission-summary', { params }),
  
  // Withdraw commission
  withdrawCommission: (data) => 
    axiosInstance.post('/api/agents/withdraw-commission', data),
  
  // Get commission history
  getCommissionHistory: (params) => 
    axiosInstance.get('/api/agents/commission-history', { params }),
  
  // Update agent commission rates (admin)
  updateCommissionRates: (agentId, data) =>
    axiosInstance.put(`/api/commission/agents/${agentId}/rates`, data),
};

/**
 * Commission Endpoints:
 * 
 * GET /api/agents/commission-summary - Get agent commission summary
 * POST /api/agents/withdraw-commission - Request commission withdrawal
 * GET /api/agents/commission-history - Get commission history
 * PUT /api/commission/agents/:agentId/rates - Update commission rates (admin)
 */