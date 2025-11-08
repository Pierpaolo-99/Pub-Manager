const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports_controller');

// GET statistiche rapide per dashboard (priorità alta - prima di altri endpoints)
router.get('/quick-stats', reportsController.getQuickStats);

// GET report vendite per periodo
router.get('/sales', reportsController.getSalesReport);

// GET prodotti top per periodo
router.get('/products/top', reportsController.getTopProducts);

// GET report inventario con filtri
router.get('/inventory', reportsController.getInventoryReport);

// GET analisi costi e profitti
router.get('/costs', reportsController.getCostsAnalysis);

module.exports = router;