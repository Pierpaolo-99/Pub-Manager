const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics_controller');

// GET overview analytics per dashboard
router.get('/overview', analyticsController.getOverviewAnalytics);

// GET sales analytics per periodo
router.get('/sales', analyticsController.getSalesAnalytics);

// GET top products
router.get('/top-products', analyticsController.getTopProducts);

// GET performance metrics
router.get('/performance', analyticsController.getPerformanceMetrics);

module.exports = router;