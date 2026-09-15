import axiosInstance from '../config/axiosConfig';

export const sportsAPI = {
  // Get available sports
  getSports: () => axiosInstance.get('/api/sports'),
  
  // Get events by sport
  getEvents: (sport, params) => 
    axiosInstance.get(`/api/sports/events/${sport}`, { params }),
  
  // Place sports bet
  placeBet: (data) => axiosInstance.post('/api/sports/bet', data),
  
  // Get bet history
  getBetHistory: (params) => 
    axiosInstance.get('/api/sports/bet-history', { params }),
  
  // Get bet details
  getBetDetails: (betSlipId) => 
    axiosInstance.get(`/api/sports/bet/${betSlipId}`),
  
  // Refresh events
  refreshEvents: (data) => 
    axiosInstance.post('/api/sports/refresh-events', data),
};

/**
 * Sports Betting Endpoints:
 * 
 * GET /api/sports - Get available sports
 * GET /api/sports/events/:sport - Get events by sport
 * POST /api/sports/bet - Place sports bet
 * GET /api/sports/bet-history - Get bet history
 * GET /api/sports/bet/:betSlipId - Get bet details
 * POST /api/sports/refresh-events - Refresh events
 */