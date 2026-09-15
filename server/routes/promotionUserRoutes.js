const express = require("express");
const {
  myBonuses,
  claimBonus,
  myFreeSpins,
  claimFreeSpins,
} = require("../controllers/promotionController");

const { protect } = require("../middleware/auth");

const router = express.Router();

// User routes (protected)
router.get("/my-bonuses", protect, myBonuses);
router.post("/claim-bonus/:turnoverId", protect, claimBonus);
router.get("/my-free-spins", protect, myFreeSpins);
router.post("/claim-free-spins/:promotionId", protect, claimFreeSpins);

module.exports = router;
