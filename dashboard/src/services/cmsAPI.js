import axiosInstance from '../config/axiosConfig';

export const cmsAPI = {
  // Get all CMS content
  getContent: (params) => 
    axiosInstance.get('/api/cms/content', { params }),
  
  // Create CMS content
  createContent: (data) => 
    axiosInstance.post('/api/cms/content', data),
  
  // Update CMS content
  updateContent: (id, data) => 
    axiosInstance.put(`/api/cms/content/${id}`, data),
  
  // Delete CMS content
  deleteContent: (id) => 
    axiosInstance.delete(`/api/cms/content/${id}`),
  
  // Get content by type (public)
  getContentByType: (type, params) => 
    axiosInstance.get(`/api/cms/content/${type}`, { params }),
};

/**
 * CMS Endpoints:
 * 
 * GET /api/cms/content - Get all CMS content (admin)
 * POST /api/cms/content - Create CMS content (admin)
 * PUT /api/cms/content/:id - Update CMS content (admin)
 * DELETE /api/cms/content/:id - Delete CMS content (admin)
 * GET /api/cms/content/:type - Get content by type (public)
 */