const express = require("express");
const {
  getActivePromoCodes,
  validatePromoCode,
} = require("../controllers/promoCodeController");

const router = express.Router();

// Public routes - no authentication required
router.get("/", getActivePromoCodes);
router.post("/validate", validatePromoCode);

module.exports = router;
