const express = require('express');
const router = express.Router();
const ingredientsMovementsController = require('../controllers/ingredients_movements_controller');

// GET stock corrente (calcolato da movimenti)
router.get('/stock', ingredientsMovementsController.getCurrentStock);

// GET statistiche movimenti 
router.get('/stats', ingredientsMovementsController.getMovementStats);

// GET tutti i movimenti con filtri
router.get('/', ingredientsMovementsController.getAllMovements);

// GET movimento per ID
router.get('/:id', ingredientsMovementsController.getMovementById);

// POST crea nuovo movimento
router.post('/', ingredientsMovementsController.createMovement);

module.exports = router;