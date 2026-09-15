import axiosInstance from '../config/axiosConfig';

export const realtimeAPI = {
  // Get available sports
  getSports: () => axiosInstance.get('/api/realtime/sports'),
  
  // Get live events by sport
  getLiveEvents: (sportKey) => 
    axiosInstance.get(`/api/realtime/live-events/${sportKey}`),
  
  // Get connection status
  getConnectionStatus: () => 
    axiosInstance.get('/api/realtime/connection-status'),
  
  // Get sports events (original endpoint)
  getSportsEvents: (sport, params) => 
    axiosInstance.get(`/api/sports/events/${sport}`, { params }),
};

/**
 * Real-time Endpoints:
 * 
 * GET /api/realtime/sports - Get available sports for real-time
 * GET /api/realtime/live-events/:sportKey - Get live events by sport key
 * GET /api/realtime/connection-status - Get WebSocket connection status
 * GET /api/sports/events/:sport - Get sports events with markets
 */