const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stock_controller');

// Statistiche stock (prima di /:id)
router.get('/stats', stockController.getStockStats);

// Fornitori disponibili
router.get('/suppliers', stockController.getStockSuppliers);

// Varianti disponibili per stock
router.get('/variants', stockController.getAvailableVariants);

// Lista stock con filtri
router.get('/', stockController.getAllStock);

// CRUD stock entries
router.post('/', stockController.createStockEntry);
router.put('/:id', stockController.updateStockEntry);
router.patch('/:id/quantity', stockController.updateStockQuantity);
router.delete('/:id', stockController.deleteStockEntry);

module.exports = router;
