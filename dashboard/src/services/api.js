import axiosInstance from "../config/axiosConfig";

export const authAPI = {
  login: (credentials) => axiosInstance.post("/api/auth/login", credentials),
  register: (userData) => axiosInstance.post("/api/auth/register", userData),
  verifyOTP: (data) => axiosInstance.post("/api/auth/verify-otp", data),
  resendOTP: (data) => axiosInstance.post("/api/auth/resend-otp", data),
  getCurrentUser: () => axiosInstance.get("/api/auth/me"),
  updateProfile: (data) => axiosInstance.put("/api/auth/profile", data),
  changePassword: (data) =>
    axiosInstance.put("/api/auth/change-password", data),
  logout: () => axiosInstance.post("/api/auth/logout"),
  forgotPassword: (email) =>
    axiosInstance.post("/api/auth/forgot-password", email),
  resetPassword: (data) => axiosInstance.post("/api/auth/reset-password", data),
};

export const dashboardAPI = {
  getAdminDashboard: () => axiosInstance.get("/api/admin/dashboard"),
  getAgentDashboard: () => axiosInstance.get("/api/agents/dashboard"),
  getMasterAgentDashboard: () =>
    axiosInstance.get("/api/agent-dashboard/overview"),
};

export const ggrTopUpAPI = {
  getLatest: () => axiosInstance.get("/api/admin/ggr-topup/latest"),
};

export const userAPI = {
  // Admin endpoints - sees ALL users
  getUsers: (params) => axiosInstance.get("/api/admin/users", { params }),
  getUser: (userId) => axiosInstance.get(`/api/admin/users/${userId}`),

  // Agent endpoints - sees ONLY users they created (referredBy)
  getDownlineUsers: (params) =>
    axiosInstance.get("/api/user-management/users", { params }),

  // Create user
  createUser: (data) =>
    axiosInstance.post("/api/user-management/create-user", data),

  // Update user
  updateUser: (userId, data) =>
    axiosInstance.put(`/api/user-management/users/${userId}`, data),
  updateUserAdmin: (userId, data) =>
    axiosInstance.put(`/api/admin/users/${userId}`, data),
  updateUserStatus: (userId, data) =>
    axiosInstance.put(`/api/admin/users/${userId}/status`, data),
  adjustBalance: (data) =>
    axiosInstance.post("/api/user-management/adjust-balance", data),

  // Agent user management endpoints
  createUserByAgent: (data) =>
    axiosInstance.post("/api/user-management/create-user", data),
  resetUserPassword: (data) =>
    axiosInstance.post("/api/user-management/reset-password", data),
  getUserActivityLogs: (params) =>
    axiosInstance.get("/api/user-management/activity-logs", { params }),
};

export const announcementAPI = {
  getAnnouncements: () => axiosInstance.get("/api/announcements/admin"),
  createAnnouncement: (data) =>
    axiosInstance.post("/api/announcements/admin", data),
  updateAnnouncement: (id, data) =>
    axiosInstance.put(`/api/announcements/admin/${id}`, data),
  deleteAnnouncement: (id) =>
    axiosInstance.delete(`/api/announcements/admin/${id}`),
  toggleStatus: (id, isActive) =>
    axiosInstance.patch(`/api/announcements/admin/${id}/status`, { isActive }),
};

export const agentAPI = {
  // Admin endpoints - for creating master agents
  getAgents: (params) => axiosInstance.get("/api/admin/agents", { params }),
  getAdminHierarchy: () => axiosInstance.get("/api/admin/hierarchy"),
  createAgent: (data) =>
    axiosInstance.post("/api/admin-management/agents/master", data),
  getAgentHierarchy: (agentId) =>
    axiosInstance.get(`/api/admin-management/agents/${agentId}/hierarchy`),
  updateAgentPermissions: (agentId, data) =>
    axiosInstance.put(
      `/api/admin-management/agents/${agentId}/permissions`,
      data,
    ),

  // Agent Management - Create sub-agents (for agents with permission)
  createSubAgent: (data) =>
    axiosInstance.post("/api/agent-management/sub-agents", data),

  // Get downline agents (scoped to current agent's hierarchy)
  getDownlineAgents: (params) =>
    axiosInstance.get("/api/agent-management/sub-agents", { params }),

  // Update sub-agent commission
  updateSubAgentCommission: (subAgentId, data) =>
    axiosInstance.put(
      `/api/agent-management/sub-agents/${subAgentId}/commission`,
      data,
    ),

  // Add balance to user (for agents with permission)
  addUserBalance: (data) =>
    axiosInstance.post("/api/agent-management/users/balance", data),

  // Get agent's own hierarchy
  getMyHierarchy: () => axiosInstance.get("/api/agents/hierarchy"),

  // Dashboard
  getAgentDashboard: () => axiosInstance.get("/api/agents/dashboard"),

  // Get downline users (players)
  getDownlineUsers: (params) =>
    axiosInstance.get("/api/agents/downline", { params }),

  // Get complete hierarchy (all downline agents and users recursively)
  getCompleteHierarchy: (params) =>
    axiosInstance.get("/api/agent-hierarchy/complete", { params }),

  // Commission management
  getCommissionSummary: () =>
    axiosInstance.get("/api/agents/commission-summary"),
  getCommissionHistory: (params) =>
    axiosInstance.get("/api/agents/commissions", { params }),
  withdrawCommission: (data) =>
    axiosInstance.post("/api/agents/withdraw-commission", data),

  // Agent permissions
  getAgentPermissions: () =>
    axiosInstance.get("/api/agent-management/permissions"),

  // Settings (admin/master agent only)
  updateAgentSettings: (agentId, data) =>
    axiosInstance.put(`/api/agents/settings/${agentId}`, data),
};

export const paymentAPI = {
  // Deposit methods
  getDepositMethods: () => axiosInstance.get("/api/payments/deposit-methods"),

  // Create deposit
  createDeposit: (data) => axiosInstance.post("/api/payments/deposit", data),

  // Get deposit history
  getDepositHistory: (params) =>
    axiosInstance.get("/api/payments/deposits", { params }),

  // Get deposit details
  getDepositDetails: (depositId) =>
    axiosInstance.get(`/api/payments/deposits/${depositId}`),

  // Cancel deposit
  cancelDeposit: (depositId) =>
    axiosInstance.put(`/api/payments/deposits/${depositId}/cancel`),

  // Withdrawal methods
  getWithdrawalMethods: () =>
    axiosInstance.get("/api/payments/withdrawal-methods"),

  // Create withdrawal
  createWithdrawal: (data) =>
    axiosInstance.post("/api/payments/withdraw", data),

  // Get withdrawal history
  getWithdrawalHistory: (params) =>
    axiosInstance.get("/api/payments/withdrawals", { params }),

  // Get withdrawal details
  getWithdrawalDetails: (withdrawalId) =>
    axiosInstance.get(`/api/payments/withdrawals/${withdrawalId}`),

  // Cancel withdrawal
  cancelWithdrawal: (withdrawalId) =>
    axiosInstance.put(`/api/payments/withdrawals/${withdrawalId}/cancel`),

  // Admin endpoints - sees ALL transactions
  getPendingTransactions: (params) =>
    axiosInstance.get("/api/admin/transactions/pending", { params }),
  approveTransaction: (type, id, data) =>
    axiosInstance.put(`/api/admin/transactions/${type}/${id}/approve`, data),
  rejectTransaction: (type, id, data) =>
    axiosInstance.put(`/api/admin/transactions/${type}/${id}/reject`, data),

  // Agent endpoints - sees ONLY downline transactions (hierarchy-scoped)
  getDownlinePendingTransactions: (params) =>
    axiosInstance.get("/api/agent-transactions/pending", { params }),
  approveDeposit: (depositId, data) =>
    axiosInstance.put(
      `/api/agent-transactions/deposits/${depositId}/approve`,
      data,
    ),
  approveWithdrawal: (withdrawalId, data) =>
    axiosInstance.put(
      `/api/agent-transactions/withdrawals/${withdrawalId}/approve`,
      data,
    ),
};

export const reportAPI = {
  // Financial Reports
  getFinancialReport: (params) =>
    axiosInstance.get("/api/admin/reports/financial", { params }),

  // Commission Reports
  getCommissionReport: (params) =>
    axiosInstance.get("/api/admin-management/reports/commission", { params }),

  // Analytics Dashboard
  getGamingAnalytics: (params) =>
    axiosInstance.get("/api/admin/analytics/gaming", { params }),
  getSportsAnalytics: (params) =>
    axiosInstance.get("/api/admin/analytics/sports", { params }),
};

// Agent Balance (admin + agent flows)
export const agentBalanceAPI = {
  // Admin wallet overview
  getAdminWalletOverview: () =>
    axiosInstance.get("/api/admin-financial/wallet-overview"),

  // Add funds to agent (admin)
  addFundsToAgent: (data) =>
    axiosInstance.post("/api/admin-financial/add-funds-to-agent", data),

  // Deduct funds from agent (admin)
  deductFundsFromAgent: (data) =>
    axiosInstance.post("/api/admin-financial/deduct-funds-from-agent", data),

  // Transfer to sub-agent (agent/master)
  transferToSubAgent: (data) =>
    axiosInstance.post("/api/agent-balance/transfer-sub-agent", data),

  // Deduct from user (agent)
  deductFromUser: (data) =>
    axiosInstance.post("/api/agent-balance/deduct-user", data),

  // Get agent transaction history (admin)
  getAgentTransactions: (params) =>
    axiosInstance.get("/api/admin-financial/agent-transactions", { params }),

  // Get specific agent wallet balance (admin)
  getAgentWalletBalance: (agentId) =>
    axiosInstance.get(`/api/admin-financial/agents/${agentId}/wallet-balance`),

  // Get agent's own wallet balance (for logged-in agent)
  getMyWalletBalance: () => axiosInstance.get("/api/agent-balance/my-wallet"),

  // Get agent's transaction history (for logged-in agent)
  getMyTransactions: (params) =>
    axiosInstance.get("/api/agent-balance/my-transactions", { params }),
};

// Add the missing walletAPI
export const walletAPI = {
  // Get wallet balance for current user/agent
  getWalletBalance: () => axiosInstance.get("/api/wallet/balance"),
  getBalance: () => axiosInstance.get("/api/wallet/balance"), // Alias for compatibility

  // Get transaction history
  getTransactionHistory: (params) =>
    axiosInstance.get("/api/wallet/transactions", { params }),
  getTransactions: (params) =>
    axiosInstance.get("/api/wallet/transactions", { params }), // Alias for compatibility

  // Get wallet summary
  getWalletSummary: () => axiosInstance.get("/api/wallet/summary"),

  // Transfer between wallets (main, bonus, free bets)
  transferBetweenWallets: (data) =>
    axiosInstance.post("/api/wallet/transfer", data),
  transfer: (data) => axiosInstance.post("/api/wallet/transfer", data), // Alias for compatibility

  // Transfer to another user
  transferToUser: (data) =>
    axiosInstance.post("/api/wallet/transfer-to-user", data),

  // Transfer to another agent
  transferToAgent: (data) =>
    axiosInstance.post("/api/wallet/transfer-to-agent", data),

  // Get transfer history
  getTransferHistory: (params) =>
    axiosInstance.get("/api/wallet/transfer-history", { params }),

  // Get wallet limits
  getWalletLimits: () => axiosInstance.get("/api/wallet/limits"),

  // Verify transfer (for large amounts)
  verifyTransfer: (data) =>
    axiosInstance.post("/api/wallet/verify-transfer", data),
};

// Add the missing commissionAPI
export const commissionAPI = {
  // Get commission overview for current agent
  getCommissionOverview: () =>
    axiosInstance.get("/api/agents/commission-summary"),

  // Get commission history with filters
  getCommissionHistory: (params) =>
    axiosInstance.get("/api/agents/commissions", { params }),

  // Get commission withdrawal history
  getCommissionWithdrawalHistory: (params) =>
    axiosInstance.get("/api/agents/commission-withdrawals", { params }),

  // Request commission withdrawal
  requestWithdrawal: (data) =>
    axiosInstance.post("/api/agents/withdraw-commission", data),

  // Get pending withdrawal requests (for admin)
  getPendingWithdrawals: (params) =>
    axiosInstance.get("/api/admin/commission/pending-withdrawals", { params }),

  // Approve/Reject withdrawal request (for admin)
  processWithdrawal: (requestId, data) =>
    axiosInstance.put(
      `/api/admin/commission/withdrawals/${requestId}/process`,
      data,
    ),

  // Get commission reports (for admin)
  getCommissionReports: (params) =>
    axiosInstance.get("/api/admin-management/reports/commission", { params }),

  // Update commission settings (for admin)
  updateCommissionSettings: (data) =>
    axiosInstance.put("/api/admin/commission/settings", data),

  // Get commission rates for different levels
  getCommissionRates: () => axiosInstance.get("/api/commission/rates"),

  // Calculate commission for a specific period
  calculateCommission: (data) =>
    axiosInstance.post("/api/commission/calculate", data),
};

export const affiliateAPI = {
  getApplications: (params) =>
    axiosInstance.get("/api/admin/affiliates/applications", { params }),
  getApplicationDetails: (applicationId) =>
    axiosInstance.get(`/api/admin/affiliates/applications/${applicationId}`),
  approveApplication: (applicationId, data) =>
    axiosInstance.patch(
      `/api/admin/affiliates/applications/${applicationId}/approve`,
      data,
    ),
  rejectApplication: (applicationId, data) =>
    axiosInstance.patch(
      `/api/admin/affiliates/applications/${applicationId}/reject`,
      data,
    ),
  suspendAffiliate: (userId, data) =>
    axiosInstance.patch(`/api/admin/affiliates/${userId}/suspend`, data),
  updateAffiliateStatus: (userId, data) =>
    axiosInstance.patch(`/api/admin/affiliates/${userId}/status`, data),
  getAffiliateConfig: (userId) =>
    axiosInstance.get(`/api/admin/affiliates/${userId}/config`),
  updateAffiliateConfig: (userId, data) =>
    axiosInstance.patch(`/api/admin/affiliates/${userId}/config`, data),
  runAffiliateSettlement: (userId, data) =>
    axiosInstance.post(`/api/admin/affiliates/${userId}/settlements/run`, data),
  runDueSettlements: () =>
    axiosInstance.post("/api/admin/affiliates/settlements/run-due"),
  refreshAffiliateStatistics: (userId) =>
    axiosInstance.post(`/api/admin/affiliates/${userId}/statistics/refresh`),
  getAffiliateTransactions: (userId, params) =>
    axiosInstance.get(`/api/admin/affiliates/${userId}/transactions`, {
      params,
    }),
  getWithdrawals: (params) =>
    axiosInstance.get("/api/admin/affiliates/withdrawals", { params }),
  approveWithdrawal: (withdrawalId, data) =>
    axiosInstance.patch(
      `/api/admin/affiliates/withdrawals/${withdrawalId}/approve`,
      data,
    ),
  rejectWithdrawal: (withdrawalId, data) =>
    axiosInstance.patch(
      `/api/admin/affiliates/withdrawals/${withdrawalId}/reject`,
      data,
    ),
};

export const referralAPI = {
  getConfig: () => axiosInstance.get("/api/admin/referrals/config"),
  updateConfig: (data) =>
    axiosInstance.put("/api/admin/referrals/config", data),
  getAnalytics: (params) =>
    axiosInstance.get("/api/admin/referrals/analytics", { params }),
  getHistory: (params) =>
    axiosInstance.get("/api/admin/referrals/history", { params }),
  getHistoryDetails: (relationshipId) =>
    axiosInstance.get(`/api/admin/referrals/history/${relationshipId}`),
  getPendingClaims: (params) =>
    axiosInstance.get("/api/admin/referrals/pending-claims", { params }),
};

// Add the missing gameAPI
export const gameAPI = {
  // Get all games with filters
  getGames: (params) => axiosInstance.get("/api/games", { params }),

  // Get all game providers
  getGameProviders: () => axiosInstance.get("/api/games/providers"),

  // Get games by provider
  getGamesByProvider: (providerId) =>
    axiosInstance.get(`/api/games/providers/${providerId}/games`),

  // Get all games with filters (alias for compatibility)
  getAllGames: (params) => axiosInstance.get("/api/games", { params }),

  // Get featured games
  getFeaturedGames: () => axiosInstance.get("/api/games/featured"),

  // Get popular games
  getPopularGames: () => axiosInstance.get("/api/games/popular"),

  // Get game categories
  getGameCategories: () => axiosInstance.get("/api/games/categories"),

  // Get promotion form data (providers + categories)
  getPromotionFormData: () =>
    axiosInstance.get("/api/games/admin/promotion-data"),
  // Launch game session
  launchGame: (gameId, data) =>
    axiosInstance.post(`/api/games/${gameId}/launch`, data),

  // Get game history
  getGameHistory: (params) =>
    axiosInstance.get("/api/games/history", { params }),

  // Get game statistics
  getGameStats: () => axiosInstance.get("/api/games/stats"),

  // Search games
  searchGames: (query) =>
    axiosInstance.get("/api/games/search", { params: { query } }),

  // Get game details
  getGameDetails: (gameId) => axiosInstance.get(`/api/games/${gameId}/details`),

  // Get favorite games
  getFavoriteGames: () => axiosInstance.get("/api/games/favorites"),

  // Add/Remove favorite game
  toggleFavorite: (gameId) =>
    axiosInstance.post(`/api/games/${gameId}/favorite`),

  // Get active game sessions
  getActiveSessions: () => axiosInstance.get("/api/games/active-sessions"),

  // Update game configuration
  updateGameConfig: (gameId, data) =>
    axiosInstance.put(`/api/game-config/games/${gameId}`, data),

  // Get single game configuration
  getGameConfig: (gameId) =>
    axiosInstance.get(`/api/game-config/games/${gameId}`),

  // Get game configurations
  getGameConfigs: (params) =>
    axiosInstance.get("/api/game-config/games", { params }),

  // Toggle maintenance mode
  toggleMaintenanceMode: (gameId, data) =>
    axiosInstance.put(`/api/game-config/games/${gameId}/maintenance`, data),
};

// Add the missing realtimeAPI
export const realtimeAPI = {
  // Get connection status
  getConnectionStatus: () =>
    axiosInstance.get("/api/realtime/connection-status"),

  // Get available sports
  getSports: () => axiosInstance.get("/api/realtime/sports"),

  // Get live events by sport
  getLiveEvents: (sportKey) =>
    axiosInstance.get(`/api/realtime/events/${sportKey}`),

  // Get all live events
  getAllLiveEvents: () => axiosInstance.get("/api/realtime/events/live"),

  // Get event details
  getEventDetails: (eventId) =>
    axiosInstance.get(`/api/realtime/events/${eventId}/details`),

  // Get live scores
  getLiveScores: (eventId) =>
    axiosInstance.get(`/api/realtime/events/${eventId}/scores`),

  // Get odds for an event
  getEventOdds: (eventId) =>
    axiosInstance.get(`/api/realtime/events/${eventId}/odds`),

  // Subscribe to live updates (WebSocket simulation)
  subscribeToEvents: (sportKey) =>
    axiosInstance.post("/api/realtime/subscribe", { sportKey }),

  // Unsubscribe from updates
  unsubscribeFromEvents: (sportKey) =>
    axiosInstance.post("/api/realtime/unsubscribe", { sportKey }),

  // Get market movements
  getMarketMovements: (eventId) =>
    axiosInstance.get(`/api/realtime/events/${eventId}/markets`),

  // Get in-play statistics
  getInPlayStats: (eventId) =>
    axiosInstance.get(`/api/realtime/events/${eventId}/stats`),
};

// Add the missing promoAPI
export const promoAPI = {
  // Get all promo codes (admin)
  getPromoCodes: (params) =>
    axiosInstance.get("/api/admin/promo-codes", { params }),

  // Create new promo code (admin)
  createPromoCode: (data) => axiosInstance.post("/api/admin/promo-codes", data),

  // Update promo code (admin)
  updatePromoCode: (promoId, data) =>
    axiosInstance.put(`/api/admin/promo-codes/${promoId}`, data),

  // Delete promo code (admin)
  deletePromoCode: (promoId) =>
    axiosInstance.delete(`/api/admin/promo-codes/${promoId}`),

  // Get promo code details
  getPromoCodeDetails: (promoId) =>
    axiosInstance.get(`/api/admin/promo-codes/${promoId}`),

  // Get user's promo codes
  getMyPromoCodes: () => axiosInstance.get("/api/promo-codes/my-promos"),

  // Apply promo code
  applyPromoCode: (data) => axiosInstance.post("/api/promo-codes/apply", data),

  // Validate promo code
  validatePromoCode: (code, data) =>
    axiosInstance.post("/api/promo-codes/validate", { code, ...data }),

  // Get promo usage statistics
  getPromoUsageStats: (promoId) =>
    axiosInstance.get(`/api/admin/promo-codes/${promoId}/stats`),

  // Get promo analytics
  getPromoAnalytics: (params) =>
    axiosInstance.get("/api/admin/promo-codes/analytics", { params }),

  // Toggle promo code status
  togglePromoStatus: (promoId, isActive) =>
    axiosInstance.put(`/api/admin/promo-codes/${promoId}/status`, { isActive }),

  // Get promo types
  getPromoTypes: () => axiosInstance.get("/api/promo-codes/types"),

  // Get active promos for users
  getActivePromos: () => axiosInstance.get("/api/promo-codes/active"),
};

// Add the missing autoApprovalAPI
export const autoApprovalAPI = {
  // Get all payment gateways with auto-approval settings
  getGateways: () => axiosInstance.get("/api/admin/auto-approval/gateways"),

  // Update gateway auto-approval settings
  updateGatewaySettings: (gatewayId, data) =>
    axiosInstance.put(`/api/admin/auto-approval/gateways/${gatewayId}`, data),

  // Get auto-promo rules
  getAutoPromoRules: () =>
    axiosInstance.get("/api/admin/auto-approval/promo-rules"),

  // Update auto-promo rule
  updateAutoPromoRule: (ruleId, data) =>
    axiosInstance.put(`/api/admin/auto-approval/promo-rules/${ruleId}`, data),

  // Process auto-approval manually
  processAutoApproval: () =>
    axiosInstance.post("/api/admin/auto-approval/process"),

  // Get auto-approval statistics
  getAutoApprovalStats: () =>
    axiosInstance.get("/api/admin/auto-approval/stats"),

  // Get auto-approval logs
  getAutoApprovalLogs: (params) =>
    axiosInstance.get("/api/admin/auto-approval/logs", { params }),

  // Test auto-approval rules
  testAutoApproval: (data) =>
    axiosInstance.post("/api/admin/auto-approval/test", data),

  // Get auto-approval settings
  getAutoApprovalSettings: () =>
    axiosInstance.get("/api/admin/auto-approval/settings"),

  // Update auto-approval settings
  updateAutoApprovalSettings: (data) =>
    axiosInstance.put("/api/admin/auto-approval/settings", data),

  // Get pending auto-approval transactions
  getPendingAutoApprovals: () =>
    axiosInstance.get("/api/admin/auto-approval/pending"),

  // Bulk update gateway settings
  bulkUpdateGateways: (data) =>
    axiosInstance.put("/api/admin/auto-approval/gateways/bulk-update", data),
};

export const seoAPI = {
  // Get global SEO settings
  getGlobalSEOSettings: () => axiosInstance.get("/api/admin/seo/global"),

  // Update global SEO settings
  updateGlobalSEOSettings: (data) =>
    axiosInstance.put("/api/admin/seo/global", data),

  // Get SEO settings for specific page
  getPageSEOSettings: (page) =>
    axiosInstance.get(`/api/admin/seo/pages/${page}`),

  // Update SEO settings for specific page
  updatePageSEOSettings: (page, data) =>
    axiosInstance.put(`/api/admin/seo/pages/${page}`, data),
};

export const cmsAPI = {
  // Get content with optional filters (type, status, etc.)
  getContent: (params = {}) =>
    axiosInstance.get("/api/cms/content", { params }),

  // Create CMS content
  createContent: (data) =>
    axiosInstance.post(
      "/api/cms/content",
      data,
      data instanceof FormData
        ? {
            headers: { "Content-Type": "multipart/form-data" },
          }
        : undefined,
    ),

  // Update CMS content by ID
  updateContent: (id, data) =>
    axiosInstance.put(
      `/api/cms/content/${id}`,
      data,
      data instanceof FormData
        ? {
            headers: { "Content-Type": "multipart/form-data" },
          }
        : undefined,
    ),

  // Delete CMS content by ID
  deleteContent: (id) => axiosInstance.delete(`/api/cms/content/${id}`),

  // Get single content (optional, if needed)
  getSingleContent: (id) => axiosInstance.get(`/api/cms/content/${id}`),

  // Get content by type (public route)
  getContentByType: (type) => axiosInstance.get(`/api/cms/content/${type}`),

  getBanners: (params = {}) =>
    axiosInstance.get("/api/cms/banners", { params }),
  getBannerDetails: (id) => axiosInstance.get(`/api/cms/banners/details/${id}`),
  createBanner: (data) =>
    axiosInstance.post("/api/cms/banners", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  updateBanner: (id, data) =>
    axiosInstance.put(`/api/cms/banners/${id}`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  deleteBanner: (id) => axiosInstance.delete(`/api/cms/banners/${id}`),
  updateBannerStatus: (id, data) =>
    axiosInstance.patch(`/api/cms/banners/${id}/status`, data),
  reorderBanners: (items) =>
    axiosInstance.patch("/api/cms/banners/reorder", { items }),
  getFavoriteSliderBanners: () =>
    axiosInstance.get("/api/cms/banners/favorite-slider"),
};

export const healthAPI = {
  // Provider health list
  getProviderHealth: () => axiosInstance.get("/api/admin/health/providers"),

  // System health overview
  getSystemHealth: () => axiosInstance.get("/api/admin/health/system"),

  // Trigger manual health check
  manualHealthCheck: () => axiosInstance.post("/api/admin/health/check"),
};

export const fraudAPI = {
  // Get fraud alerts
  getFraudAlerts: () => axiosInstance.get("/api/admin/fraud/alerts"),

  // Get suspicious login attempts
  getSuspiciousLogins: () =>
    axiosInstance.get("/api/admin/fraud/suspicious-logins"),

  // Get provider health (fraud-related)
  getProviderHealth: () => axiosInstance.get("/api/admin/fraud/providers"),

  // Resolve fraud alert
  resolveAlert: (alertId, data) =>
    axiosInstance.put(`/api/admin/fraud/alerts/${alertId}/resolve`, data),

  // Manual system health check
  manualHealthCheck: () => axiosInstance.post("/api/admin/fraud/health-check"),
};

export const permissionAPI = {
  // Get all permission templates
  getPermissionTemplates: () =>
    axiosInstance.get("/api/admin/permissions/templates"),

  // Create new permission template
  createPermissionTemplate: (data) =>
    axiosInstance.post("/api/admin/permissions/templates", data),

  // Update a permission template
  updatePermissionTemplate: (templateId, data) =>
    axiosInstance.put(`/api/admin/permissions/templates/${templateId}`, data),

  // Delete a permission template
  deletePermissionTemplate: (templateId) =>
    axiosInstance.delete(`/api/admin/permissions/templates/${templateId}`),

  // Create agent with permissions
  createAgentWithPermissions: (data) =>
    axiosInstance.post("/api/admin/agents/create-with-permissions", data),

  // Fetch agent permissions
  getAgentPermissions: (agentId) =>
    axiosInstance.get(`/api/admin/agents/${agentId}/permissions`),

  // Update agent permissions
  updateAgentPermissions: (agentId, data) =>
    axiosInstance.put(`/api/admin/agents/${agentId}/permissions`, data),
};

// Add the missing sportsAPI
export const sportsAPI = {
  // Get all sports
  getSports: () => axiosInstance.get("/api/sports"),

  // Get events by sport
  getEventsBySport: (sportKey) =>
    axiosInstance.get(`/api/sports/events/${sportKey}`),

  // Get live events
  getLiveEvents: () => axiosInstance.get("/api/sports/events/live"),

  // Refresh events data
  refreshEvents: () => axiosInstance.post("/api/sports/refresh-events"),

  // Place a bet
  placeBet: (data) => axiosInstance.post("/api/sports/bet", data),

  // Get bet history
  getBetHistory: (params) =>
    axiosInstance.get("/api/sports/bet-history", { params }),

  // Get bet details
  getBetDetails: (betSlipId) =>
    axiosInstance.get(`/api/sports/bet/${betSlipId}`),

  // Get sports statistics
  getSportsStats: () => axiosInstance.get("/api/sports/stats"),

  // Get upcoming events
  getUpcomingEvents: (sportKey) =>
    axiosInstance.get(`/api/sports/upcoming/${sportKey}`),

  // Get event odds
  getEventOdds: (eventId) =>
    axiosInstance.get(`/api/sports/events/${eventId}/odds`),
};

// Add the missing notificationAPI
export const notificationAPI = {
  // Get user notifications
  getNotifications: (params) =>
    axiosInstance.get("/api/notifications", { params }),

  // Get notification statistics
  getNotificationStats: () => axiosInstance.get("/api/notifications/stats"),

  // Mark notification as read
  markAsRead: (notificationId) =>
    axiosInstance.put(`/api/notifications/${notificationId}/read`),

  // Mark all notifications as read
  markAllAsRead: () => axiosInstance.put("/api/notifications/read-all"),

  // Delete a notification
  deleteNotification: (notificationId) =>
    axiosInstance.delete(`/api/notifications/${notificationId}`),

  // Clear all notifications
  clearAllNotifications: () => axiosInstance.delete("/api/notifications"),

  // Send notification (admin)
  sendNotification: (data) =>
    axiosInstance.post("/api/admin/notifications/send", data),

  // Get notification templates (admin)
  getNotificationTemplates: () =>
    axiosInstance.get("/api/admin/notifications/templates"),

  // Create notification template (admin)
  createNotificationTemplate: (data) =>
    axiosInstance.post("/api/admin/notifications/templates", data),

  // Update notification template (admin)
  updateNotificationTemplate: (templateId, data) =>
    axiosInstance.put(`/api/admin/notifications/templates/${templateId}`, data),

  // Delete notification template (admin)
  deleteNotificationTemplate: (templateId) =>
    axiosInstance.delete(`/api/admin/notifications/templates/${templateId}`),
};

// Add the missing adminAPI
export const adminAPI = {
  // Dashboard data
  getDashboard: () => axiosInstance.get("/api/admin/dashboard"),

  // Financial reports
  getFinancialReport: (params) =>
    axiosInstance.get("/api/admin/reports/financial", { params }),

  // Gaming analytics
  getGamingAnalytics: (params) =>
    axiosInstance.get("/api/admin/analytics/gaming", { params }),

  // Sports analytics
  getSportsAnalytics: (params) =>
    axiosInstance.get("/api/admin/analytics/sports", { params }),

  // User management
  getUsers: (params) => axiosInstance.get("/api/admin/users", { params }),
  updateUserStatus: (userId, data) =>
    axiosInstance.put(`/api/admin/users/${userId}/status`, data),
  adjustUserBalance: (userId, data) =>
    axiosInstance.post(`/api/admin/users/${userId}/adjust-balance`, data),

  // Transaction management
  getPendingTransactions: (params) =>
    axiosInstance.get("/api/admin/transactions/pending", { params }),
  approveTransaction: (type, id, data) =>
    axiosInstance.put(`/api/admin/transactions/${type}/${id}/approve`, data),
  rejectTransaction: (type, id, data) =>
    axiosInstance.put(`/api/admin/transactions/${type}/${id}/reject`, data),

  // Agent management
  getAgents: (params) => axiosInstance.get("/api/admin/agents", { params }),
  updateAgentCommission: (agentId, data) =>
    axiosInstance.put(`/api/admin/agents/${agentId}/commission`, data),

  // Promo code management
  getPromoCodes: (params) =>
    axiosInstance.get("/api/admin/promo-codes", { params }),
  createPromoCode: (data) => axiosInstance.post("/api/admin/promo-codes", data),
  updatePromoCode: (promoId, data) =>
    axiosInstance.put(`/api/admin/promo-codes/${promoId}`, data),

  // System health
  getSystemHealth: () => axiosInstance.get("/api/admin/system-health"),
};

// Promotion management API (for advanced promotion features with categories, providers, free spins)
export const promotionAPI = {
  // Get all promotions
  getAllPromotions: (params) =>
    axiosInstance.get("/api/admin/promotions", { params }),

  // Create new promotion
  createPromotion: (data) => axiosInstance.post("/api/admin/promotions", data),

  // Get promotion by ID
  getPromotionById: (promoId) =>
    axiosInstance.get(`/api/admin/promotions/${promoId}`),

  // Update promotion
  updatePromotion: (promoId, data) =>
    axiosInstance.put(`/api/admin/promotions/${promoId}`, data),

  // Delete promotion
  deletePromotion: (promoId) =>
    axiosInstance.delete(`/api/admin/promotions/${promoId}`),

  // Activate promotion
  activatePromotion: (promoId) =>
    axiosInstance.put(`/api/admin/promotions/${promoId}/activate`),

  // Deactivate promotion
  deactivatePromotion: (promoId) =>
    axiosInstance.put(`/api/admin/promotions/${promoId}/deactivate`),
};

export const liveChatAPI = {
  getConversations: (params) =>
    axiosInstance.get("/api/conversations", { params }),
  createConversation: () => axiosInstance.post("/api/conversations"),
  getConversationDetails: (conversationId) =>
    axiosInstance.get(`/api/conversations/${conversationId}`),
  closeConversation: (conversationId) =>
    axiosInstance.patch(`/api/conversations/${conversationId}/close`),
  markConversationRead: (conversationId) =>
    axiosInstance.patch(`/api/conversations/${conversationId}/read`),
  getMessages: (conversationId, params) =>
    axiosInstance.get(`/api/conversations/${conversationId}/messages`, {
      params,
    }),
  sendMessage: (conversationId, data) =>
    axiosInstance.post(`/api/conversations/${conversationId}/messages`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  adminReply: (conversationId, data) =>
    axiosInstance.post(
      `/api/conversations/${conversationId}/admin-reply`,
      data,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    ),
  uploadAttachment: (conversationId, data) =>
    axiosInstance.post(
      `/api/conversations/${conversationId}/attachments`,
      data,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    ),
  deleteAttachment: (conversationId, attachmentId) =>
    axiosInstance.delete(
      `/api/conversations/${conversationId}/attachments/${attachmentId}`,
    ),
  assignConversation: (conversationId, data) =>
    axiosInstance.patch(`/api/conversations/${conversationId}/assign`, data),
  updateStatus: (conversationId, data) =>
    axiosInstance.patch(`/api/conversations/${conversationId}/status`, data),
  updatePriority: (conversationId, data) =>
    axiosInstance.patch(`/api/conversations/${conversationId}/priority`, data),
  updateTags: (conversationId, data) =>
    axiosInstance.patch(`/api/conversations/${conversationId}/tags`, data),
  archiveConversation: (conversationId) =>
    axiosInstance.patch(`/api/conversations/${conversationId}/archive`),
  restoreConversation: (conversationId) =>
    axiosInstance.patch(`/api/conversations/${conversationId}/restore`),
  updateRestriction: (conversationId, data) =>
    axiosInstance.patch(
      `/api/conversations/${conversationId}/restriction`,
      data,
    ),
  getNotes: (conversationId) =>
    axiosInstance.get(`/api/conversations/${conversationId}/notes`),
  createNote: (conversationId, data) =>
    axiosInstance.post(`/api/conversations/${conversationId}/notes`, data),
  updateNote: (conversationId, noteId, data) =>
    axiosInstance.put(
      `/api/conversations/${conversationId}/notes/${noteId}`,
      data,
    ),
  deleteNote: (conversationId, noteId) =>
    axiosInstance.delete(
      `/api/conversations/${conversationId}/notes/${noteId}`,
    ),
  getSavedReplies: (params) =>
    axiosInstance.get("/api/conversations/saved-replies", { params }),
  createSavedReply: (data) =>
    axiosInstance.post("/api/conversations/saved-replies", data),
  updateSavedReply: (replyId, data) =>
    axiosInstance.put(`/api/conversations/saved-replies/${replyId}`, data),
  deleteSavedReply: (replyId) =>
    axiosInstance.delete(`/api/conversations/saved-replies/${replyId}`),
  useSavedReply: (replyId) =>
    axiosInstance.post(`/api/conversations/saved-replies/${replyId}/use`),
  getAnalytics: () => axiosInstance.get("/api/conversations/analytics/summary"),
  exportConversation: (conversationId, format = "txt") =>
    axiosInstance.get(`/api/conversations/${conversationId}/export`, {
      params: { format },
      responseType: "blob",
    }),
};

// Admin Bets History API
export const adminBetsAPI = {
  getBets: (params) => axiosInstance.get("/api/admin/bets", { params }),
};

export const betHistoryAPI = adminBetsAPI;

export const paymentGatewayRoutingAPI = {
  getRoutingConfig: () => axiosInstance.get("/api/admin/payment-gateway"),
  switchGateway: (gateway) =>
    axiosInstance.put("/api/admin/payment-gateway", { gateway }),
  updateRoutingConfig: (data) =>
    axiosInstance.put("/api/admin/payment-gateway", data),
};
