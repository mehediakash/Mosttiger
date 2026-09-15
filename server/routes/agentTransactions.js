const express = require('express');
const transactionApprovalController = require('../controllers/transactionApprovalController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('master_agent', 'agent', 'sub_agent'));

router.get('/pending', transactionApprovalController.getPendingTransactions);
router.put('/deposits/:depositId/approve', transactionApprovalController.approveDeposit);
router.put('/withdrawals/:withdrawalId/approve', transactionApprovalController.approveWithdrawal);

module.exports = router;