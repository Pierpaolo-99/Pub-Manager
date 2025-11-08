const express = require('express');
const router = express.Router();
const categoriesController = require('../controllers/categories_controller');

// GET statistiche categorie (prima di /:id)
router.get('/stats', categoriesController.getCategoryStats);

// GET categorie attive per dropdown (prima di /:id)
router.get('/active', categoriesController.getActiveCategories);

// GET tutte le categorie con filtri
router.get('/', categoriesController.getCategories);

// GET singola categoria per ID
router.get('/:id', categoriesController.getCategoryById);

// POST nuova categoria
router.post('/', categoriesController.createCategory);

// PATCH aggiornamento categoria
router.patch('/:id', categoriesController.updateCategory);

// DELETE categoria
router.delete('/:id', categoriesController.deleteCategory);

module.exports = router;
