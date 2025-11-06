const express = require('express');
const router = express.Router();
const financialController = require('../controllers/financial_controller');

// Route finanziarie
router.get('/summary', financialController.getFinancialSummary);
router.get('/detailed', financialController.getDetailedReport);
router.get('/export', financialController.exportFinancialData);

module.exports = router;