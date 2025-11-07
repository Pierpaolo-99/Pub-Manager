const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports_controller');

// Routes per reports
router.get('/sales', reportsController.getSalesReport);
router.get('/products/top', reportsController.getTopProducts);
router.get('/inventory', reportsController.getInventoryReport);
router.get('/costs', reportsController.getCostsAnalysis);
router.get('/quick-stats', reportsController.getQuickStats);

module.exports = router;