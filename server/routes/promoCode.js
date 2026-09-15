const express = require('express');
const {
  applyPromoCode,
  getMyPromoCodes,
  getPromoCodeDetails,
  getPromoCodeAnalytics
} = require('../controllers/promoCodeController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes (protected)
router.use(protect);

// User promo code routes
router.post('/apply', applyPromoCode);
router.get('/my-codes', getMyPromoCodes);
router.get('/:code', getPromoCodeDetails);

// Admin analytics route
router.get('/:id/analytics', authorize('admin'), getPromoCodeAnalytics);

module.exports = router;