import axiosInstance from '../config/axiosConfig';

export const walletAPI = {
  // Get wallet balance
  getBalance: () => axiosInstance.get('/api/wallet/balance'),
  
  // Get transaction history
  getTransactions: (params) => 
    axiosInstance.get('/api/wallet/transactions', { params }),
  
  // Transfer between wallets
  transfer: (data) => axiosInstance.post('/api/wallet/transfer', data),
  
  // Get wallet summary (for agents)
  getWalletSummary: () => 
    axiosInstance.get('/api/agent-financial/wallet-summary'),
};

/**
 * Wallet Transfer Endpoints:
 * 
 * GET /api/wallet/balance - Get user wallet balances
 * GET /api/wallet/transactions - Get transaction history
 * POST /api/wallet/transfer - Transfer between wallets
 * GET /api/agent-financial/wallet-summary - Get agent wallet summary
 */