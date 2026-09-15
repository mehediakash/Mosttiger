import api from "../axios/axios";

export const liveChatService = {
  getRealtimeStatus: () => api.get("/api/realtime/connection-status"),
  createConversation: () => api.post("/api/conversations"),
  getConversations: (params) => api.get("/api/conversations", { params }),
  getConversationDetails: (conversationId) =>
    api.get(`/api/conversations/${conversationId}`),
  markConversationRead: (conversationId) =>
    api.patch(`/api/conversations/${conversationId}/read`),
  getMessages: (conversationId, params) =>
    api.get(`/api/conversations/${conversationId}/messages`, { params }),
  sendMessage: (conversationId, data, config = {}) =>
    api.post(`/api/conversations/${conversationId}/messages`, data, {
      ...config,
      headers: {
        ...(config.headers || {}),
        "Content-Type": "multipart/form-data",
      },
    }),
  rateConversation: (conversationId, data) =>
    api.post(`/api/conversations/${conversationId}/rating`, data),
};
