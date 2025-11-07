const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stock_controller');

// Routes per stock prodotti (NUOVE)
router.get('/', stockController.getAllStock);
router.get('/stats', stockController.getStockStats);
router.get('/suppliers', stockController.getStockSuppliers);
router.get('/variants', stockController.getAvailableVariants);

router.post('/', stockController.createStockEntry);
router.put('/:id', stockController.updateStockEntry);
router.patch('/:id/quantity', stockController.updateStockQuantity);
router.delete('/:id', stockController.deleteStockEntry);

// VARIANTI (ESISTENTI)
router.get('/stockVariants', stockController.getVariantsStock);
router.patch('/stockVariants/:id', stockController.updateVariantStock);

// FUSTI / KEGS (ESISTENTI)
router.get('/stockKegs', stockController.getKegs);
router.patch('/stockKegs/:id', stockController.updateKegLiters);

module.exports = router;
