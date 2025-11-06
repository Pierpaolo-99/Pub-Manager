const express = require('express');
const router = express.Router();
const ingredientStockController = require('../controllers/ingredients_stock_controller');

// Routes per ingredient stock
router.get('/', ingredientStockController.getAllIngredientStock);
router.get('/stats', ingredientStockController.getStockStats);
router.get('/locations', ingredientStockController.getLocations);
router.get('/suppliers', ingredientStockController.getSuppliers);

router.post('/', ingredientStockController.createStockEntry);
router.put('/:id', ingredientStockController.updateStockEntry);
router.delete('/:id', ingredientStockController.deleteStockEntry);

module.exports = router;