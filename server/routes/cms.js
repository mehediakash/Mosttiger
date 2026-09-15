const express = require('express');
const cmsController = require('../controllers/cmsController');
const cmsBannerController = require('../controllers/cmsBannerController');
const { protect, authorize } = require('../middleware/auth');
const { singleCloudinaryImage } = require('../middleware/cloudinaryUpload');

const router = express.Router();

// Public routes
router.get('/banners/favorite-slider', cmsBannerController.getPublicFavoriteSliderBanners);
router.get('/banners/:type', cmsBannerController.getPublicBannersByType);
router.get('/content/:type', cmsController.getContentByType);

// Admin routes
router.use(protect);
router.use(authorize('admin'));

router.post('/banners', singleCloudinaryImage('image'), cmsBannerController.createBanner);
router.get('/banners', cmsBannerController.getBanners);
router.get('/banners/details/:bannerId', cmsBannerController.getBannerDetails);
router.put('/banners/:bannerId', singleCloudinaryImage('image'), cmsBannerController.updateBanner);
router.delete('/banners/:bannerId', cmsBannerController.deleteBanner);
router.patch('/banners/:bannerId/status', cmsBannerController.changeStatus);
router.patch('/banners/reorder', cmsBannerController.reorderBanners);

router.post('/content', singleCloudinaryImage('image'), cmsController.createContent);
router.get('/content', cmsController.getAllContent);
router.put('/content/:contentId', singleCloudinaryImage('image'), cmsController.updateContent);
router.delete('/content/:contentId', cmsController.deleteContent);

module.exports = router;
