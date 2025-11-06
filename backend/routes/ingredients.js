const express = require('express');
const router = express.Router();
const ingredientsController = require('../controllers/ingredients_controller');

// Route ingredienti
router.get('/', ingredientsController.getAllIngredients);
router.get('/categories', ingredientsController.getIngredientCategories);
router.get('/suppliers', ingredientsController.getSuppliers);
router.get('/storage-types', ingredientsController.getStorageTypes);
router.get('/:id', ingredientsController.getIngredientById);
router.post('/', ingredientsController.createIngredient);
router.put('/:id', ingredientsController.updateIngredient);
router.delete('/:id', ingredientsController.deleteIngredient);

module.exports = router;