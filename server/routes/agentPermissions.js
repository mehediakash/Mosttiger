const express = require('express');
const agentPermissionController = require('../controllers/agentPermissionController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.post('/create', agentPermissionController.createAgentWithPermissions);
router.put('/:agentId', agentPermissionController.updateAgentPermissions);
router.get('/templates', agentPermissionController.getPermissionTemplates);

module.exports = router;