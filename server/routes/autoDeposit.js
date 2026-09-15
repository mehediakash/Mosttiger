const express = require('express');
const autoDepositController = require('../controllers/autoDepositController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.put('/gateways/:gatewayId/settings', autoDepositController.updateAutoApprovalSettings);
router.get('/gateways', autoDepositController.getPaymentGatewaySettings);
router.post('/process', autoDepositController.processAutoApproval);

module.exports = router;