const express = require("express");
const router = express.Router();
const {
  getActiveGatewayPublic,
} = require("../controllers/paymentGatewayRoutingController");

router.get("/active", getActiveGatewayPublic);

module.exports = router;
