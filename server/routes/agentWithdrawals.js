const express = require('express');
const agentWithdrawalController = require('../controllers/agentWithdrawalController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('master_agent', 'agent', 'sub_agent'));

router.put('/:withdrawalId/approve', agentWithdrawalController.approveWithdrawal);
router.put('/:withdrawalId/reject', agentWithdrawalController.rejectWithdrawal);
router.get('/stats', agentWithdrawalController.getWithdrawalStats);

module.exports = router;