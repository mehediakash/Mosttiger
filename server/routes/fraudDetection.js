const express = require('express');
const fraudDetectionController = require('../controllers/fraudDetectionController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/alerts', fraudDetectionController.getFraudAlerts);
router.put('/alerts/:alertId/resolve', fraudDetectionController.resolveAlert);

module.exports = router;