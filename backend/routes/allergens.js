const express = require('express');
const router = express.Router();
const allergenController = require('../controllers/allergens_controller');

// GET statistiche allergeni (prima di /:id)
router.get('/stats', allergenController.getAllergenStats);

// GET allergeni attivi per dropdown (prima di /:id)
router.get('/active', allergenController.getActiveAllergens);

// GET allergeni per prodotto specifico
router.get('/product/:productId', allergenController.getProductAllergens);

// GET tutti gli allergeni con filtri
router.get('/', allergenController.getAllergens);

// GET singolo allergene per ID
router.get('/:id', allergenController.getAllergenById);

// POST nuovo allergene
router.post('/', allergenController.createAllergen);

// POST assegna allergene a prodotto
router.post('/assign', allergenController.addAllergenToProduct);

// PATCH aggiornamento allergene
router.patch('/:id', allergenController.updateAllergen);

// DELETE allergene
router.delete('/:id', allergenController.deleteAllergen);

// DELETE rimuovi allergene da prodotto
router.delete('/remove/:productId/:allergenId', allergenController.removeAllergenFromProduct);

module.exports = router;
