const express = require('express');
const {
  getSports,
  getEventsBySport,
  getLiveEvents,
  placeBet,
  getBetHistory,
  getBetDetails,
  refreshEvents
} = require('../controllers/sportsController');

const { protect } = require('../middleware/auth');

const router = express.Router();

// Sports data routes
router.get('/', protect, getSports);
router.get('/events/:sportKey', protect, getEventsBySport);
router.get('/events/live', protect, getLiveEvents);
router.post('/refresh-events', protect, refreshEvents);

// Betting routes
router.post('/bet', protect, placeBet);
router.get('/bet-history', protect, getBetHistory);
router.get('/bet/:betSlipId', protect, getBetDetails);

module.exports = router;