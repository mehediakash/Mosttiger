const express = require('express');
const loginLogsController = require('../controllers/loginLogsController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', loginLogsController.getLoginLogs);
router.get('/suspicious', authorize('admin'), loginLogsController.getSuspiciousLogins);

module.exports = router;