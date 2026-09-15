import axiosInstance from '../config/axiosConfig';

export const gameAPI = {
  // Get all games
  getGames: (params) => axiosInstance.get('/api/games', { params }),
  
  // Launch casino game
  launchGame: (gameId, data) => 
    axiosInstance.post(`/api/games/launch/${gameId}`, data),
  
  // Get game history
  getGameHistory: (params) => 
    axiosInstance.get('/api/games/history', { params }),
  
  // Update game config (admin)
  updateGameConfig: (gameId, data) => 
    axiosInstance.put(`/api/game-config/games/${gameId}`, data),
  
  // Get game configs (admin)
  getGameConfigs: (params) => 
    axiosInstance.get('/api/game-config/games', { params }),
  
  // Toggle maintenance mode
  toggleMaintenance: (gameId, data) => 
    axiosInstance.put(`/api/game-config/games/${gameId}/maintenance`, data),
};

/**
 * Game Endpoints:
 * 
 * GET /api/games - Get all games with filters
 * POST /api/games/launch/:gameId - Launch casino game
 * GET /api/games/history - Get game history
 * PUT /api/game-config/games/:gameId - Update game config (admin)
 * GET /api/game-config/games - Get game configs (admin)
 * PUT /api/game-config/games/:gameId/maintenance - Toggle maintenance (admin)
 */