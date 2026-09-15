const express = require('express');
const agentReportsController = require('../controllers/agentReportsController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// Agent routes
router.get('/detailed', authorize('master_agent', 'agent', 'sub_agent'), agentReportsController.getAgentDetailedReport);

// Admin routes
router.get('/admin/agent-reports/:agentId', authorize('admin'), agentReportsController.getAgentDetailedReport);

module.exports = router;