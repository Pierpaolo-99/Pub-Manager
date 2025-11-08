const express = require('express');
const router = express.Router();
const stockMovementsController = require('../controllers/stock_movements_controller');

// GET statistiche movimenti
router.get('/stats', stockMovementsController.getMovementsStats);

// GET prodotti per dropdown
router.get('/products', stockMovementsController.getProductsForMovements);

// GET tutti i movimenti
router.get('/', stockMovementsController.getAllMovements);

// POST nuovo movimento
router.post('/', stockMovementsController.createMovement);

// PUT aggiornamento movimento
router.put('/:id', stockMovementsController.updateMovement);

// DELETE movimento
router.delete('/:id', stockMovementsController.deleteMovement);

module.exports = router;