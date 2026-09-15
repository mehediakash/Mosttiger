const express = require("express");
const ggrTopUpController = require("../controllers/ggrTopUpController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(protect);
router.use(authorize("admin"));

router.get("/latest", ggrTopUpController.getLatestGGR);

module.exports = router;
