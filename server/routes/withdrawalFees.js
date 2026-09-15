const express = require('express');
const withdrawalFeeController = require('../controllers/withdrawalFeeController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.put('/global', withdrawalFeeController.updateGlobalFees);
router.put('/users/:userId/custom', withdrawalFeeController.setUserCustomFees);
router.get('/settings', withdrawalFeeController.getFeeSettings);

module.exports = router;