const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stock_controller');

// VARIANTI
router.get('/stockVariants', stockController.getVariantsStock);
router.patch('/stockVariants/:id', stockController.updateVariantStock);

// FUSTI / KEGS
router.get('/stockKegs', stockController.getKegs);
router.patch('/stockKegs/:id', stockController.updateKegLiters);

module.exports = router;
