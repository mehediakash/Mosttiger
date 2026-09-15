const express = require('express');
const agentFinancialController = require('../controllers/agentFinancialController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('master_agent', 'agent', 'sub_agent'));

router.post('/transfer-to-user', agentFinancialController.transferToUser);
router.get('/transfer-history', agentFinancialController.getTransferHistory);
router.get('/wallet-summary', agentFinancialController.getAgentWalletSummary);

module.exports = router;