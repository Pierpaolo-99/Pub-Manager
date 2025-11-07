const express = require('express');
const router = express.Router();
const stockMovementsController = require('../controllers/stock_movements_controller');

// GET tutti i movimenti
router.get('/', stockMovementsController.getAllStockMovements);

// GET statistiche movimenti
router.get('/stats', stockMovementsController.getMovementStats);

// GET prodotti per dropdown
router.get('/products', stockMovementsController.getProductsForMovements);

// GET movimenti per prodotto specifico
router.get('/product/:productId', stockMovementsController.getProductMovements);

// POST nuovo movimento
router.post('/', stockMovementsController.createStockMovement);

// PUT aggiornamento movimento
router.put('/:id', stockMovementsController.updateStockMovement);

// DELETE movimento
router.delete('/:id', stockMovementsController.deleteStockMovement);

module.exports = router;