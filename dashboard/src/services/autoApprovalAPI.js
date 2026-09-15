import axiosInstance from '../config/axiosConfig';

// Auth API
export const authAPI = {
  login: (credentials) => axiosInstance.post('/api/auth/login', credentials),
  register: (userData) => axiosInstance.post('/api/auth/register', userData),
  getCurrentUser: () => axiosInstance.get('/api/auth/me'),
  forgotPassword: (email) => axiosInstance.post('/api/auth/forgot-password', { email }),
  resetPassword: (data) => axiosInstance.post('/api/auth/reset-password', data),
  verifyOtp: (data) => axiosInstance.post('/api/auth/verify-otp', data),
};

// Dashboard API
export const dashboardAPI = {
  getAdminDashboard: () => axiosInstance.get('/api/admin/dashboard'),
  getAgentDashboard: () => axiosInstance.get('/api/agents/dashboard'),
  getMasterAgentDashboard: () => axiosInstance.get('/api/agent-dashboard/overview'),
};

// User Management API
export const userAPI = {
  getUsers: (params) => axiosInstance.get('/api/admin/users', { params }),
  createUser: (data) => axiosInstance.post('/api/user-management/create-user', data),
  updateUserStatus: (userId, data) => 
    axiosInstance.put(`/api/admin/users/${userId}/status`, data),
  adjustBalance: (userId, data) => 
    axiosInstance.post(`/api/admin/users/${userId}/adjust-balance`, data),
  getActivityLogs: (params) => 
    axiosInstance.get('/api/user-management/activity-logs', { params }),
};

// Agent Management API
export const agentAPI = {
  getAgents: () => axiosInstance.get('/api/admin/agents'),
  createAgent: (data) => axiosInstance.post('/api/admin-management/agents/master', data),
  getAgentHierarchy: (agentId) => 
    axiosInstance.get(`/api/admin-management/agents/${agentId}/hierarchy`),
  updateAgentPermissions: (agentId, data) => 
    axiosInstance.put(`/api/admin-management/agents/${agentId}/permissions`, data),
  toggleAgentStatus: (agentId, data) => 
    axiosInstance.put(`/api/admin-management/agents/${agentId}/status`, data),
};

// Payment API
export const paymentAPI = {
  getDepositMethods: () => axiosInstance.get('/api/payments/deposit-methods'),
  getWithdrawalMethods: () => axiosInstance.get('/api/payments/withdrawal-methods'),
  getPendingTransactions: () => axiosInstance.get('/api/admin/transactions/pending'),
  approveTransaction: (type, id, data) => 
    axiosInstance.put(`/api/admin/transactions/${type}/${id}/approve`, data),
  rejectTransaction: (type, id, data) => 
    axiosInstance.put(`/api/admin/transactions/${type}/${id}/reject`, data),
};

// Report API
export const reportAPI = {
  getFinancialReport: (params) => 
    axiosInstance.get('/api/admin/reports/financial', { params }),
  getCommissionReport: (params) => 
    axiosInstance.get('/api/admin-management/reports/commission', { params }),
};

// Wallet API
export const walletAPI = {
  getBalance: () => axiosInstance.get('/api/wallet/balance'),
  getTransactions: (params) => 
    axiosInstance.get('/api/wallet/transactions', { params }),
  transfer: (data) => axiosInstance.post('/api/wallet/transfer', data),
  getWalletSummary: () => 
    axiosInstance.get('/api/agent-financial/wallet-summary'),
};

// Commission API
export const commissionAPI = {
  getCommissionSummary: (params) => 
    axiosInstance.get('/api/agents/commission-summary', { params }),
  withdrawCommission: (data) => 
    axiosInstance.post('/api/agents/withdraw-commission', data),
  getCommissionHistory: (params) => 
    axiosInstance.get('/api/agents/commission-history', { params }),
  updateCommissionRates: (agentId, data) =>
    axiosInstance.put(`/api/commission/agents/${agentId}/rates`, data),
};

// Game API
export const gameAPI = {
  getGames: (params) => axiosInstance.get('/api/games', { params }),
  launchGame: (gameId, data) => 
    axiosInstance.post(`/api/games/launch/${gameId}`, data),
  getGameHistory: (params) => 
    axiosInstance.get('/api/games/history', { params }),
  updateGameConfig: (gameId, data) => 
    axiosInstance.put(`/api/game-config/games/${gameId}`, data),
  getGameConfigs: (params) => 
    axiosInstance.get('/api/game-config/games', { params }),
  toggleMaintenance: (gameId, data) => 
    axiosInstance.put(`/api/game-config/games/${gameId}/maintenance`, data),
};

// Sports API
export const sportsAPI = {
  getSports: () => axiosInstance.get('/api/sports'),
  getEvents: (sport, params) => 
    axiosInstance.get(`/api/sports/events/${sport}`, { params }),
  placeBet: (data) => axiosInstance.post('/api/sports/bet', data),
  getBetHistory: (params) => 
    axiosInstance.get('/api/sports/bet-history', { params }),
  getBetDetails: (betSlipId) => 
    axiosInstance.get(`/api/sports/bet/${betSlipId}`),
  refreshEvents: (data) => 
    axiosInstance.post('/api/sports/refresh-events', data),
};

// Real-time API
export const realtimeAPI = {
  getSports: () => axiosInstance.get('/api/realtime/sports'),
  getLiveEvents: (sportKey) => 
    axiosInstance.get(`/api/realtime/live-events/${sportKey}`),
  getConnectionStatus: () => 
    axiosInstance.get('/api/realtime/connection-status'),
};

// Promo API
export const promoAPI = {
  getPromoCodes: (params) => 
    axiosInstance.get('/api/admin/promo-codes', { params }),
  createPromoCode: (data) => 
    axiosInstance.post('/api/admin/promo-codes', data),
  updatePromoCode: (id, data) => 
    axiosInstance.put(`/api/admin/promo-codes/${id}`, data),
  applyPromoCode: (data) => 
    axiosInstance.post('/api/promo-codes/apply', data),
  getMyPromoCodes: () => 
    axiosInstance.get('/api/promo-codes/my-codes'),
  getPromoDetails: (code) => 
    axiosInstance.get(`/api/promo-codes/?code=${code}`),
  getPromoAnalytics: (id) => 
    axiosInstance.get(`/api/promo-codes/${id}/analytics`),
};

// Agent Balance API
export const agentBalanceAPI = {
  addFundsToAgent: (data) => 
    axiosInstance.post('/api/admin-financial/add-funds-to-agent', data),
  deductFundsFromAgent: (data) => 
    axiosInstance.post('/api/admin-financial/deduct-funds-from-agent', data),
  transferToSubAgent: (data) => 
    axiosInstance.post('/api/agent-balance/transfer-sub-agent', data),
  deductFromUser: (data) => 
    axiosInstance.post('/api/agent-balance/deduct-user', data),
  getAdminWalletOverview: () => 
    axiosInstance.get('/api/admin-financial/wallet-overview'),
  getPlatformSummary: () => 
    axiosInstance.get('/api/admin-financial/platform-summary'),
};

// Auto Approval API
export const autoApprovalAPI = {
  getGateways: () => 
    axiosInstance.get('/api/auto-deposit/gateways'),
  updateGatewaySettings: (gatewayId, data) => 
    axiosInstance.put(`/api/auto-deposit/gateways/${gatewayId}/settings`, data),
  processAutoApproval: () => 
    axiosInstance.post('/api/auto-deposit/process'),
  getAutoPromoRules: () => 
    axiosInstance.get('/api/auto-promo/rules'),
  updateAutoPromoRule: (promoCodeId, data) => 
    axiosInstance.put(`/api/auto-promo/rules/${promoCodeId}`, data),
  triggerAutoApply: (depositId) => 
    axiosInstance.post(`/api/auto-promo/apply-deposit/${depositId}`),
};

// Fraud Detection API
export const fraudAPI = {
  getFraudAlerts: (params) => 
    axiosInstance.get('/api/fraud-detection/alerts', { params }),
  resolveAlert: (alertId, data) => 
    axiosInstance.post(`/api/fraud-detection/alerts/${alertId}/resolve`, data),
  getSuspiciousLogins: () => 
    axiosInstance.get('/api/login-logs/suspicious'),
  getProviderHealth: () => 
    axiosInstance.get('/api/provider-health/status'),
  manualHealthCheck: () => 
    axiosInstance.post('/api/provider-health/check'),
};

// CMS API
export const cmsAPI = {
  getContent: (params) => 
    axiosInstance.get('/api/cms/content', { params }),
  createContent: (data) => 
    axiosInstance.post('/api/cms/content', data),
  updateContent: (id, data) => 
    axiosInstance.put(`/api/cms/content/${id}`, data),
  deleteContent: (id) => 
    axiosInstance.delete(`/api/cms/content/${id}`),
  getContentByType: (type, params) => 
    axiosInstance.get(`/api/cms/content/${type}`, { params }),
};

// Health API
export const healthAPI = {
  getProviderHealth: () => 
    axiosInstance.get('/api/provider-health/status'),
  manualHealthCheck: () => 
    axiosInstance.post('/api/provider-health/check'),
  getSystemHealth: () => 
    axiosInstance.get('/api/admin/system-health'),
};

// Permission API
export const permissionAPI = {
  createAgentWithPermissions: (data) => 
    axiosInstance.post('/api/agent-permissions/create', data),
  updateAgentPermissions: (agentId, data) => 
    axiosInstance.put(`/api/agent-permissions/${agentId}`, data),
  getPermissionTemplates: () => 
    axiosInstance.get('/api/agent-permissions/templates'),
};

// SEO API
export const seoAPI = {
  getGlobalSEOSettings: () => 
    axiosInstance.get('/api/seo-settings'),
  updateGlobalSEOSettings: (data) => 
    axiosInstance.put('/api/seo-settings', data),
  getPageSEOSettings: (page) => 
    axiosInstance.get(`/api/seo-settings/pages/${page}`),
  updatePageSEOSettings: (page, data) => 
    axiosInstance.put(`/api/seo-settings/pages/${page}`, data),
};