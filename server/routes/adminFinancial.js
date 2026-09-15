const express = require('express');
const adminFinancialController = require('../controllers/adminFinancialController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.post('/add-funds-to-agent', adminFinancialController.addFundsToAgent);
router.post('/deduct-funds-from-agent', adminFinancialController.deductFundsFromAgent);
router.get('/wallet-overview', adminFinancialController.getAdminWalletOverview);
router.get('/platform-summary', adminFinancialController.getPlatformFinancialSummary);

module.exports = router;