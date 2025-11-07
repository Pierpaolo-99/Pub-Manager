const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics_controller');

// GET overview analytics
router.get('/overview', analyticsController.getOverviewAnalytics);

module.exports = router;