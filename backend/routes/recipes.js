const express = require('express');
const router = express.Router();
const recipesController = require('../controllers/recipes_controller');

// Routes per ricette
router.get('/', recipesController.getAllRecipes);
router.get('/stats', recipesController.getRecipesStats);
router.get('/products', recipesController.getAvailableProducts);
router.get('/:id', recipesController.getRecipeById);

router.post('/', recipesController.createRecipe);
router.put('/:id', recipesController.updateRecipe);
router.delete('/:id', recipesController.deleteRecipe);

module.exports = router;