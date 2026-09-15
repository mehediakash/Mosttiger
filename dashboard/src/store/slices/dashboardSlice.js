import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  stats: {},
  recentActivities: [],
  financialData: {},
  gamingData: {},
  agentStats: {},
  userGrowth: [],
  loading: false,
  error: null,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    fetchDashboardStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchDashboardSuccess: (state, action) => {
      state.loading = false;
      state.stats = action.payload.stats;
      state.recentActivities = action.payload.recentActivities;
      state.financialData = action.payload.financialData;
      state.gamingData = action.payload.gamingData || {};
      state.agentStats = action.payload.agentStats || {};
      state.userGrowth = action.payload.userGrowth || [];
    },
    fetchDashboardFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    clearDashboardError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchDashboardStart,
  fetchDashboardSuccess,
  fetchDashboardFailure,
  clearDashboardError,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;