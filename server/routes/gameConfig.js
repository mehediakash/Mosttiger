const express = require('express');
const gameConfigController = require('../controllers/gameConfigController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.put('/games/:gameId', gameConfigController.updateGameConfig);
router.get('/games/:gameId', gameConfigController.getGameConfig);
router.get('/games', gameConfigController.getGameConfigs);
router.put('/games/:gameId/maintenance', gameConfigController.toggleMaintenanceMode);

module.exports = router;