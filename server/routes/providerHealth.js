const express = require('express');
const providerHealthService = require('../services/providerHealthService');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/status', async (req, res) => {
  try {
    const status = await providerHealthService.getProviderHealthStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/check', async (req, res) => {
  try {
    const results = await providerHealthService.checkAllProvidersHealth();
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;