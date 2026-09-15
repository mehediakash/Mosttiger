const express = require('express');
const {
  createAgent,
  getAgentHierarchy,
  getAgentDashboard,
  getCommissionSummary,
  getCommissionHistory,
  withdrawCommission,
  getCommissionWithdrawalHistory,
  updateAgentSettings,
  getDownlineUsers
} = require('../controllers/agentController');

const { protect, authorize } = require('../middleware/auth');
const agentManagementController = require('../controllers/agentManagementController');

const router = express.Router();

// All routes protected
router.use(protect);

// Agent management routes
router.post('/', authorize('admin', 'master_agent', 'agent'), createAgent);
router.get('/hierarchy', authorize('master_agent', 'agent', 'sub_agent'), getAgentHierarchy);
router.get('/dashboard', authorize('master_agent', 'agent', 'sub_agent'), getAgentDashboard);
router.get('/downline', authorize('master_agent', 'agent', 'sub_agent'), getDownlineUsers);

// Commission routes
router.get('/commission-summary', authorize('admin', 'master_agent', 'agent', 'sub_agent'), getCommissionSummary);
router.get('/commissions', authorize('admin', 'master_agent', 'agent', 'sub_agent'), getCommissionHistory);
router.get('/commission-withdrawals', authorize('admin', 'master_agent', 'agent', 'sub_agent'), getCommissionWithdrawalHistory);
router.post('/withdraw-commission', authorize('admin', 'master_agent', 'agent', 'sub_agent'), withdrawCommission);
router.get('/permissions', authorize('master_agent', 'agent', 'sub_agent'), agentManagementController.getAgentPermissions);
// Settings routes (admin/master agent only)
router.put('/settings/:agentId', authorize('admin', 'master_agent'), updateAgentSettings);

module.exports = router;