const express = require('express');
const commissionSplitService = require('../services/commissionSplitService');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.put('/agents/:agentId/rates', async (req, res) => {
  try {
    const { agentId } = req.params;
    const result = await commissionSplitService.updateAgentCommissionRates(agentId, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;