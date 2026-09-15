const express = require('express');
const autoPromoService = require('../services/autoPromoService');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/rules', async (req, res) => {
  try {
    const rules = await autoPromoService.getAutoApplyRules();
    res.json({ success: true, data: rules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/rules/:promoCodeId', async (req, res) => {
  try {
    const { promoCodeId } = req.params;
    const result = await autoPromoService.updateAutoApplyRule(promoCodeId, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/apply-deposit/:depositId', async (req, res) => {
  try {
    const { depositId } = req.params;
    const result = await autoPromoService.autoApplyPromoForDeposit(null, 0, depositId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;