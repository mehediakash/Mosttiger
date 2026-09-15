import axiosInstance from '../config/axiosConfig';

export const agentBalanceAPI = {
  // Add funds to agent
  addFundsToAgent: (data) => 
    axiosInstance.post('/api/admin-financial/add-funds-to-agent', data),
  
  // Deduct funds from agent
  deductFundsFromAgent: (data) => 
    axiosInstance.post('/api/admin-financial/deduct-funds-from-agent', data),
  
  // Transfer to sub-agent
  transferToSubAgent: (data) => 
    axiosInstance.post('/api/agent-balance/transfer-sub-agent', data),
  
  // Deduct from user (for agents)
  deductFromUser: (data) => 
    axiosInstance.post('/api/agent-balance/deduct-user', data),
  
  // Get admin wallet overview
  getAdminWalletOverview: () => 
    axiosInstance.get('/api/admin-financial/wallet-overview'),
  
  // Get platform financial summary
  getPlatformSummary: () => 
    axiosInstance.get('/api/admin-financial/platform-summary'),
};

/**
 * Agent Balance Management Endpoints:
 * 
 * POST /api/admin-financial/add-funds-to-agent - Add funds to agent (admin)
 * POST /api/admin-financial/deduct-funds-from-agent - Deduct funds from agent (admin)
 * POST /api/agent-balance/transfer-sub-agent - Transfer to sub-agent (master/agent)
 * POST /api/agent-balance/deduct-user - Deduct from user (agents)
 * GET /api/admin-financial/wallet-overview - Get admin wallet overview
 * GET /api/admin-financial/platform-summary - Get platform financial summary
 */