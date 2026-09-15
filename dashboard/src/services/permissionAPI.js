import axiosInstance from '../config/axiosConfig';

export const permissionAPI = {
  // Create agent with permissions
  createAgentWithPermissions: (data) => 
    axiosInstance.post('/api/agent-permissions/create', data),
  
  // Update agent permissions
  updateAgentPermissions: (agentId, data) => 
    axiosInstance.put(`/api/agent-permissions/${agentId}`, data),
  
  // Get permission templates
  getPermissionTemplates: () => 
    axiosInstance.get('/api/agent-permissions/templates'),
};

/**
 * Agent Permission Endpoints:
 * 
 * POST /api/agent-permissions/create - Create agent with custom permissions
 * PUT /api/agent-permissions/:agentId - Update agent permissions
 * GET /api/agent-permissions/templates - Get permission templates
 */