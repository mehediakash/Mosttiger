const express = require('express');
const {
  getAvailableSports,
  getLiveEvents,
  getConnectionStatus
} = require('../controllers/realtimeController');

const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes protected
router.use(protect);

router.get('/sports', getAvailableSports);
router.get('/live-events/:sportKey', getLiveEvents);
router.get('/connection-status', getConnectionStatus);

module.exports = router;