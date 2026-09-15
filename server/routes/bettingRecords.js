const express = require("express");
const {
  getBettingRecords,
  getBettingRecordsByDate,
  getBettingRecordsByProvider,
  getBettingStats,
  getBettingDetails,
} = require("../controllers/bettingRecordsController");

const { protect } = require("../middleware/auth");

const router = express.Router();

// Protect all routes with authentication
router.use(protect);

// @route   GET /api/betting-records
// @desc    Get grouped betting records summary (for BettingRecordsModal)
// @access  Private
router.get("/", getBettingRecords);

// @route   GET /api/betting-records/details
// @desc    Get detailed betting records (for BettingRecordDetailsModal)
// @access  Private
router.get("/details", getBettingDetails);

// @route   GET /api/betting-records/stats
// @desc    Get betting statistics summary
// @access  Private
router.get("/stats", getBettingStats);

// @route   GET /api/betting-records/date/:date
// @desc    Get betting records for specific date
// @access  Private
router.get("/date/:date", getBettingRecordsByDate);

// @route   GET /api/betting-records/provider/:provider
// @desc    Get betting records filtered by provider
// @access  Private
router.get("/provider/:provider", getBettingRecordsByProvider);

module.exports = router;
