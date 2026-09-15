import axiosInstance from "../config/axiosConfig";

const turnoverService = {
  // Get platform-wide statistics with safe defaults
  getPlatformStats: async () => {
    try {
      const response = await axiosInstance.get(`/api/turnover/stats/platform`);
      return (
        response?.data ?? {
          totalTurnover: 0,
          todayTurnover: 0,
          weeklyTurnover: 0,
          monthlyTurnover: 0,
        }
      );
    } catch (error) {
      console.error("Error fetching platform stats:", error);
      return {
        totalTurnover: 0,
        todayTurnover: 0,
        weeklyTurnover: 0,
        monthlyTurnover: 0,
      };
    }
  },

  // Get user turnover
  getUserTurnover: async (userId, startDate, endDate) => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await axiosInstance.get(
        `/api/turnover/user/${userId}?${params.toString()}`,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get agent team turnover
  getAgentTeamTurnover: async (agentId, startDate, endDate) => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await axiosInstance.get(
        `/api/turnover/agent/${agentId}?${params.toString()}`,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get top users by turnover with safe defaults
  getTopUsersByTurnover: async (limit = 10, startDate, endDate) => {
    try {
      const params = new URLSearchParams();
      params.append("limit", limit);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await axiosInstance.get(
        `/api/turnover/top/users?${params.toString()}`,
      );
      return {
        topUsers: response?.data?.topUsers ?? [],
        totalRecords: response?.data?.totalRecords ?? 0,
      };
    } catch (error) {
      console.error("Error fetching top users:", error);
      return {
        topUsers: [],
        totalRecords: 0,
      };
    }
  },

  // Get top agents by turnover with safe defaults
  getTopAgentsByTeamTurnover: async (limit = 10, startDate, endDate) => {
    try {
      const params = new URLSearchParams();
      params.append("limit", limit);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await axiosInstance.get(
        `/api/turnover/top/agents?${params.toString()}`,
      );
      return {
        topAgents: response?.data?.topAgents ?? [],
        totalRecords: response?.data?.totalRecords ?? 0,
      };
    } catch (error) {
      console.error("Error fetching top agents:", error);
      return {
        topAgents: [],
        totalRecords: 0,
      };
    }
  },

  // Get filtered turnover data with safe defaults
  getFilteredData: async (
    filterType = "today",
    userId,
    agentId,
    page = 1,
    limit = 50,
  ) => {
    try {
      const params = new URLSearchParams();
      params.append("filterType", filterType);
      params.append("page", page);
      params.append("limit", limit);
      if (userId) params.append("userId", userId);
      if (agentId) params.append("agentId", agentId);

      const response = await axiosInstance.get(
        `/api/turnover/filtered/data?${params.toString()}`,
      );
      return {
        data: response?.data?.data ?? [],
        pagination: response?.data?.pagination ?? {
          page: 1,
          limit: 50,
          total: 0,
          pages: 0,
        },
        stats: response?.data?.stats ?? {
          totalTurnover: 0,
          totalBets: 0,
          avgBetAmount: 0,
        },
        filterType: response?.data?.filterType ?? filterType,
      };
    } catch (error) {
      console.error("Error fetching filtered data:", error);
      return {
        data: [],
        pagination: { page: 1, limit: 50, total: 0, pages: 0 },
        stats: { totalTurnover: 0, totalBets: 0, avgBetAmount: 0 },
        filterType,
      };
    }
  },

  // Get users with turnover with safe defaults
  getUsersWithTurnover: async (page = 1, limit = 50, sortBy = "turnover") => {
    try {
      const params = new URLSearchParams();
      params.append("page", page);
      params.append("limit", limit);
      params.append("sortBy", sortBy);

      const response = await axiosInstance.get(
        `/api/turnover/users/list?${params.toString()}`,
      );
      return {
        data: response?.data?.data ?? [],
        pagination: response?.data?.pagination ?? {
          page: 1,
          limit: 50,
          total: 0,
          pages: 0,
        },
      };
    } catch (error) {
      console.error("Error fetching users with turnover:", error);
      return {
        data: [],
        pagination: { page: 1, limit: 50, total: 0, pages: 0 },
      };
    }
  },

  // Record new turnover
  recordTurnover: async (turnoverData) => {
    try {
      const response = await axiosInstance.post(
        `/api/turnover/record`,
        turnoverData,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update turnover status
  updateTurnoverStatus: async (betId, betStatus) => {
    try {
      const response = await axiosInstance.put(`/api/turnover/update-status`, {
        betId,
        betStatus,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default turnoverService;
