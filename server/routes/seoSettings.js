const express = require('express');
const seoSettingsController = require('../controllers/seoSettingsController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/', seoSettingsController.getSEOSettings);
router.put('/', seoSettingsController.updateSEOSettings);
router.get('/pages/:page', seoSettingsController.getPageSEOSettings);
router.put('/pages/:page', seoSettingsController.updatePageSEOSettings);

module.exports = router;