const express = require("express");
const router = express.Router();
const {
  getActiveGatewayPublic,
} = require("../controllers/paymentGatewayRoutingController");
const {
  handlePaymentWebhookController,
} = require("../controllers/paymentController");

router.get("/active", getActiveGatewayPublic);
router.post("/callback", handlePaymentWebhookController);

module.exports = router;
