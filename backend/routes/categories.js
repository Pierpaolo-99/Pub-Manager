const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categories_controller');

// CRUD categorie
router.get('/', categoryController.getCategories);
router.post('/', categoryController.createCategory);
router.patch('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;
