const express = require('express');
const adminManagementController = require('../controllers/adminManagementController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes protected and admin only
router.use(protect);
router.use(authorize('admin'));

// Agent management
router.post('/agents/master', adminManagementController.createMasterAgent);
router.put('/agents/:agentId/permissions', adminManagementController.updateAgentPermissions);
router.get('/agents/:agentId/hierarchy', adminManagementController.getAgentHierarchyTree);
router.put('/agents/:agentId/status', adminManagementController.toggleAgentStatus);

// Commission reports
router.get('/reports/commission', adminManagementController.getCommissionReport);

module.exports = router;