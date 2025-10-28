const express = require('express');
const router = express.Router();
const allergenController = require('../controllers/allergens_controller');

// CRUD allergeni
router.get('/', allergenController.getAllergens);
router.post('/', allergenController.createAllergen);
router.patch('/:id', allergenController.updateAllergen);
router.delete('/:id', allergenController.deleteAllergen);

// Assegna/rimuovi allergene a prodotto
router.post('/assign', allergenController.addAllergenToProduct);
router.delete('/remove/:productId/:allergenId', allergenController.removeAllergenFromProduct);

module.exports = router;
